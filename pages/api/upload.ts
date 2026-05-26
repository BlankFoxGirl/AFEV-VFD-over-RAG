import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";
import { extractFacts } from "@/lib/factExtraction";

type UploadRequest = {
  fileName: string;
  content: string;
};

export type UploadSuccessResponse = {
  documentId: string;
  documentName: string;
  factCount: number;
};

type ErrorResponse = {
  error: string;
};

function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isValidUploadRequest(body: unknown): body is UploadRequest {
  if (!body || typeof body !== "object") return false;
  const { fileName, content } = body as Record<string, unknown>;
  return (
    typeof fileName === "string" &&
    fileName.length > 0 &&
    typeof content === "string" &&
    content.length > 0
  );
}

async function persistExtractedFacts(
  documentId: string,
  documentName: string,
  content: string,
): Promise<number> {
  const facts = extractFacts(content, documentId);
  if (facts.length > 0) {
    await Fact.insertMany(facts.map((fact) => ({ ...fact, documentName })));
  }
  return facts.length;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadSuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isValidUploadRequest(req.body)) {
    return res
      .status(400)
      .json({ error: "fileName and content are required strings" });
  }

  const { fileName, content } = req.body;

  try {
    await connectToDatabase();
    const documentId = generateDocumentId();
    const factCount = await persistExtractedFacts(documentId, fileName, content);
    return res.status(200).json({ documentId, documentName: fileName, factCount });
  } catch {
    return res.status(500).json({ error: "Failed to process document" });
  }
}
