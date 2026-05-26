import connectToDatabase from "@/lib/db";
import Fact from "@/lib/models/Fact";
import { extractFacts, type ExtractedFact } from "@/lib/factExtraction";
import { resolveVerificationStatus } from "@/lib/factVerificationService";

export type VerificationSummary = {
  verified: number;
  unverified: number;
};

export type DocumentProcessingResult = {
  factCount: number;
  verificationSummary: VerificationSummary;
};

async function persistExtractedFacts(
  facts: ExtractedFact[],
  documentName: string,
): Promise<void> {
  if (facts.length > 0) {
    await Fact.insertMany(facts.map((fact) => ({ ...fact, documentName })));
  }
}

async function buildVerificationSummary(
  facts: ExtractedFact[],
): Promise<VerificationSummary> {
  const results = await Promise.allSettled(
    facts.map((fact) => resolveVerificationStatus(fact.text)),
  );
  return results.reduce<VerificationSummary>(
    (summary, result) => {
      if (result.status === "fulfilled" && result.value.status === "verified") {
        return { ...summary, verified: summary.verified + 1 };
      }
      return { ...summary, unverified: summary.unverified + 1 };
    },
    { verified: 0, unverified: 0 },
  );
}

export async function processUploadedDocument(
  documentId: string,
  documentName: string,
  content: string,
): Promise<DocumentProcessingResult> {
  await connectToDatabase();
  const facts = await extractFacts(content, documentId);
  await persistExtractedFacts(facts, documentName);
  const verificationSummary = await buildVerificationSummary(facts);
  return { factCount: facts.length, verificationSummary };
}
