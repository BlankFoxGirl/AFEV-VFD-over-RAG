import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";
import type { FactResponse, AnnotationResponse } from "@/pages/api/facts/index";

type AnnotateRequest = {
  annotationText: string;
  editedFactText?: string;
};

type ErrorResponse = {
  error: string;
};

function isValidAnnotateRequest(body: unknown): body is AnnotateRequest {
  if (!body || typeof body !== "object") return false;
  const { annotationText } = body as Record<string, unknown>;
  return typeof annotationText === "string" && annotationText.trim().length > 0;
}

function buildAnnotation(body: AnnotateRequest) {
  return {
    text: body.annotationText.trim(),
    editedFactText:
      typeof body.editedFactText === "string" && body.editedFactText.trim()
        ? body.editedFactText.trim()
        : null,
    createdAt: new Date(),
  };
}

function toAnnotationResponse(annotation: {
  text: string;
  editedFactText: string | null;
  createdAt: Date;
}): AnnotationResponse {
  return {
    text: annotation.text,
    editedFactText: annotation.editedFactText,
    createdAt: annotation.createdAt.toISOString(),
  };
}

function toFactResponse(fact: {
  _id: { toString(): string };
  text: string;
  context: string;
  documentId: string;
  documentName: string;
  annotations: Array<{ text: string; editedFactText: string | null; createdAt: Date }>;
}): FactResponse {
  return {
    id: fact._id.toString(),
    text: fact.text,
    context: fact.context,
    documentId: fact.documentId,
    documentName: fact.documentName,
    annotations: fact.annotations.map(toAnnotationResponse),
  };
}

async function addAnnotationToFact(
  factId: string,
  annotation: ReturnType<typeof buildAnnotation>,
  editedText: string | null,
): Promise<FactResponse> {
  const updateFields: Record<string, unknown> = {
    $push: { annotations: annotation },
  };

  if (editedText) {
    updateFields.$set = { text: editedText };
  }

  const updated = await Fact.findByIdAndUpdate(factId, updateFields, {
    new: true,
  }).lean();

  if (!updated) {
    throw new Error("Fact not found");
  }

  return toFactResponse(
    updated as {
      _id: { toString(): string };
      text: string;
      context: string;
      documentId: string;
      documentName: string;
      annotations: Array<{ text: string; editedFactText: string | null; createdAt: Date }>;
    },
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FactResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid fact id" });
  }

  if (!isValidAnnotateRequest(req.body)) {
    return res.status(400).json({ error: "annotationText is required" });
  }

  const annotation = buildAnnotation(req.body);
  const editedText = annotation.editedFactText;

  try {
    await connectToDatabase();
    const updatedFact = await addAnnotationToFact(id, annotation, editedText);
    return res.status(200).json(updatedFact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save annotation";
    if (message === "Fact not found") {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: "Failed to save annotation" });
  }
}
