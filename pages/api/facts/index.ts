import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";

export type AnnotationResponse = {
  text: string;
  editedFactText: string | null;
  createdAt: string;
};

export type FactResponse = {
  id: string;
  text: string;
  context: string;
  documentId: string;
  documentName: string;
  annotations: AnnotationResponse[];
};

type FactsListResponse = {
  facts: FactResponse[];
};

type ErrorResponse = {
  error: string;
};

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
    annotations: fact.annotations.map((a) => ({
      text: a.text,
      editedFactText: a.editedFactText,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

async function fetchFacts(documentId?: string): Promise<FactResponse[]> {
  const query = documentId ? { documentId } : {};
  const facts = await Fact.find(query).sort({ createdAt: -1 }).lean();
  return facts.map((fact) =>
    toFactResponse(
      fact as {
        _id: { toString(): string };
        text: string;
        context: string;
        documentId: string;
        documentName: string;
        annotations: Array<{ text: string; editedFactText: string | null; createdAt: Date }>;
      },
    ),
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FactsListResponse | ErrorResponse>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const documentId =
    typeof req.query.documentId === "string" ? req.query.documentId : undefined;

  try {
    await connectToDatabase();
    const facts = await fetchFacts(documentId);
    return res.status(200).json({ facts });
  } catch {
    return res.status(500).json({ error: "Failed to fetch facts" });
  }
}
