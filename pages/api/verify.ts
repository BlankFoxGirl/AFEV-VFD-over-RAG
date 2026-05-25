import type { NextApiRequest, NextApiResponse } from "next";
import {
  evaluateVerificationStatus,
  type VerificationStatus,
} from "@/lib/verification";

type VerificationResponse = {
  text: string;
  status: VerificationStatus;
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body as { text?: unknown };

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text must be a non-empty string" });
  }

  const status = evaluateVerificationStatus(text);
  return res.status(200).json({ text, status });
}
