import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import { fetchVerifiedFactDetail } from "@/lib/factVerificationService";

export type FactDetailResponse = {
  matchedFact: string;
  source: string | null;
  category: string | null;
  notes: string | null;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FactDetailResponse | ErrorResponse>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const text = typeof req.query.text === "string" ? req.query.text : undefined;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "text query parameter is required" });
  }

  try {
    await connectToDatabase();
    const detail = await fetchVerifiedFactDetail(text);
    if (!detail) {
      return res.status(404).json({ error: "Verified fact not found" });
    }
    return res.status(200).json(detail as FactDetailResponse);
  } catch {
    return res.status(500).json({ error: "Failed to fetch fact detail" });
  }
}
