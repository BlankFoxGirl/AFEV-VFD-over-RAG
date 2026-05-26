import { fetchEmbedding } from "@/lib/openaiClient";

export async function generateEmbedding(text) {
  return fetchEmbedding(text);
}

export function buildEmbeddingContext(verifiedFacts) {
  if (!verifiedFacts || verifiedFacts.length === 0) return "";
  return `Verified facts for context:\n${verifiedFacts.join("\n")}`;
}

export async function generateEmbeddingContext(userMessage, verifiedFacts) {
  if (!verifiedFacts || verifiedFacts.length === 0) return "";
  await generateEmbedding(userMessage);
  return buildEmbeddingContext(verifiedFacts);
}
