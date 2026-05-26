import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<never | ErrorResponse>,
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid fact id" });
  }

  try {
    await connectToDatabase();
    const deleted = await Fact.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Fact not found" });
    }
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: "Failed to delete fact" });
  }
}
