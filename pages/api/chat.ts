import type { NextApiRequest, NextApiResponse } from "next";
import {
  evaluateVerificationStatus,
  type VerificationStatus,
} from "@/lib/verification";

type ChatResponse = {
  reply: string;
  verificationStatus: VerificationStatus;
};

type ErrorResponse = {
  error: string;
};

function buildReply(userMessage: string): string {
  return (
    `You asked: "${userMessage}". ` +
    "This is a placeholder response from the FactCheck assistant. " +
    "Connect an AI service for real fact-checked answers."
  );
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  const reply = buildReply(message);
  const verificationStatus = evaluateVerificationStatus(reply);

  return res.status(200).json({ reply, verificationStatus });
}
