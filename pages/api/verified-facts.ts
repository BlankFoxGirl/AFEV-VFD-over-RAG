import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import VerifiedFact from "@/lib/models/VerifiedFact";

type AddVerifiedFactResponse = {
  status: "verified";
};

type ErrorResponse = {
  error: string;
};

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<AddVerifiedFactResponse | ErrorResponse>,
) {
  const body = req.body as { text?: unknown } | null | undefined;
  const text = body?.text;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text must be a non-empty string" });
  }

  try {
    await connectToDatabase();
    await VerifiedFact.findOneAndUpdate(
      { text },
      { $setOnInsert: { text, category: "user-verified", source: "manual", notes: null } },
      { upsert: true, new: true },
    );
    return res.status(200).json({ status: "verified" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[verified-facts] Failed to add verified fact: ${message}`);
    return res.status(500).json({ error: "Failed to add verified fact" });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<never | ErrorResponse>,
) {
  const body = req.body as { text?: unknown } | null | undefined;
  const text = body?.text;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text must be a non-empty string" });
  }

  try {
    await connectToDatabase();
    const deleted = await VerifiedFact.findOneAndDelete({ text });
    if (!deleted) {
      return res.status(404).json({ error: "Verified fact not found" });
    }
    return res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[verified-facts] Failed to delete verified fact: ${message}`);
    return res.status(500).json({ error: "Failed to delete verified fact" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddVerifiedFactResponse | never | ErrorResponse>,
) {
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}
