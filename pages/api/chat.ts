import type { NextApiRequest, NextApiResponse } from "next";
import { type VerificationStatus } from "@/lib/verification";
import { processMessage } from "@/lib/chatbotService";

type ChatResponse = {
  reply: string;
  verificationStatus: VerificationStatus;
  matchedFact: string | null;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { message?: unknown } | null | undefined;
  const message = body?.message;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  try {
    const result = await processMessage(message);
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: "Failed to process message" });
  }
}
