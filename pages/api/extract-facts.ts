import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";
import { extractFacts } from "@/lib/factExtraction";

type ExtractFactsRequest = {
  documentId: string;
  content: string;
  documentName?: string;
};

export type ExtractedFactResponse = {
  id: string;
  text: string;
  context: string;
  documentId: string;
  documentName: string;
};

type ExtractFactsResponse = {
  facts: ExtractedFactResponse[];
};

type ErrorResponse = {
  error: string;
};

function isValidRequest(body: unknown): body is ExtractFactsRequest {
  if (!body || typeof body !== "object") return false;
  const { documentId, content } = body as Record<string, unknown>;
  return (
    typeof documentId === "string" &&
    documentId.length > 0 &&
    typeof content === "string" &&
    content.length > 0
  );
}

async function saveAndReturnFacts(
  documentId: string,
  content: string,
  documentName: string,
): Promise<ExtractedFactResponse[]> {
  const extractedFacts = await extractFacts(content, documentId);
  const saved = await Fact.insertMany(
    extractedFacts.map((fact) => ({ ...fact, documentName })),
  );
  return saved.map((fact) => ({
    id: (fact._id as { toString(): string }).toString(),
    text: fact.text,
    context: fact.context,
    documentId: fact.documentId,
    documentName: fact.documentName,
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtractFactsResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidRequest(req.body)) {
    return res
      .status(400)
      .json({ error: "documentId and content are required strings" });
  }

  const {
    documentId,
    content,
    documentName = "Untitled Document",
  } = req.body;

  try {
    await connectToDatabase();
    const facts = await saveAndReturnFacts(documentId, content, documentName);
    return res.status(200).json({ facts });
  } catch {
    return res.status(500).json({ error: "Failed to extract facts" });
  }
}
