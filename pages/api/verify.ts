import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import VerifiedFact from "@/lib/models/VerifiedFact";
import Fact from "@/lib/models/Fact";
import {
  findBestMatch,
  classifyFact,
  type VerificationStatus,
  type MatchResult,
} from "@/lib/verification";

type VerificationResponse = {
  text: string;
  status: VerificationStatus;
  similarity: number;
  matchedFact: string | null;
};

type ErrorResponse = {
  error: string;
};

async function fetchVerifiedFactTexts(): Promise<string[]> {
  const facts = await VerifiedFact.find({}, { text: 1 }).lean();
  return facts.map((f) => (f as { text: string }).text);
}

function buildVerificationResult(
  text: string,
  match: MatchResult,
): VerificationResponse {
  return {
    text,
    status: classifyFact(match.similarity),
    similarity: match.similarity,
    matchedFact: match.matchedFact,
  };
}

async function persistVerificationStatus(factId: string, status: VerificationStatus): Promise<void> {
  const updated = await Fact.findByIdAndUpdate(
    factId,
    { $set: { verificationStatus: status } },
    { new: true },
  ).lean();
  if (!updated) {
    throw new Error(`Fact not found: ${factId}`);
  }
}

function logRequest(req: NextApiRequest, text: unknown, factId: unknown): void {
  console.debug(
    `[verify] ${req.method} text="${String(text ?? "").substring(0, 80)}" factId=${factId ?? "none"}`,
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse | ErrorResponse>,
) {
  const body = req.body as { text?: unknown; factId?: unknown } | null | undefined;
  logRequest(req, body?.text, body?.factId);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const text = body?.text;
  const factId = typeof body?.factId === "string" ? body.factId : undefined;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text must be a non-empty string" });
  }

  try {
    await connectToDatabase();
    const verifiedFactTexts = await fetchVerifiedFactTexts();
    const match = findBestMatch(text, verifiedFactTexts);
    const result = buildVerificationResult(text, match);

    if (factId) {
      await persistVerificationStatus(factId, result.status);
    }

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[verify] Failed to verify fact: ${message}`);
    if (message.startsWith("Fact not found")) {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: "Failed to verify fact" });
  }
}
