import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import VerifiedFact from "@/lib/models/VerifiedFact";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { text?: unknown } | null | undefined;
  const text = body?.text;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text must be a non-empty string" });
  }

  try {
    await connectToDatabase();
    const verifiedFactTexts = await fetchVerifiedFactTexts();
    const match = findBestMatch(text, verifiedFactTexts);
    return res.status(200).json(buildVerificationResult(text, match));
  } catch {
    return res.status(500).json({ error: "Failed to verify fact" });
  }
}
