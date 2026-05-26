import type { NextApiRequest, NextApiResponse } from "next";
import {
  processUploadedDocument,
  type VerificationSummary,
} from "@/lib/documentProcessor";

type UploadRequest = {
  fileName: string;
  content: string;
};

export type UploadSuccessResponse = {
  documentId: string;
  documentName: string;
  factCount: number;
  verificationSummary: VerificationSummary;
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
    const documentId = generateDocumentId();
    const { factCount, verificationSummary } = await processUploadedDocument(
      documentId,
      fileName,
      content,
    );
    return res
      .status(200)
      .json({ documentId, documentName: fileName, factCount, verificationSummary });
  } catch {
    return res.status(500).json({ error: "Failed to process document" });
  }
}
