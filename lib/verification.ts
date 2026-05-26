export type VerificationStatus = "verified" | "unverified" | "checking" | "none";

export type MatchResult = {
  similarity: number;
  matchedFact: string | null;
};

const SIMILARITY_THRESHOLD = 0.3;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  return new Set(normalized.split(/\s+/).filter(Boolean));
}

function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export function computeTextSimilarity(textA: string, textB: string): number {
  return computeJaccardSimilarity(tokenize(textA), tokenize(textB));
}

export function findBestMatch(factText: string, verifiedFacts: string[]): MatchResult {
  if (verifiedFacts.length === 0) {
    return { similarity: 0, matchedFact: null };
  }

  let bestSimilarity = 0;
  let bestMatch: string | null = null;

  for (const verifiedFact of verifiedFacts) {
    const similarity = computeTextSimilarity(factText, verifiedFact);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = verifiedFact;
    }
  }

  return { similarity: bestSimilarity, matchedFact: bestMatch };
}

export function classifyFact(similarity: number): VerificationStatus {
  return similarity >= SIMILARITY_THRESHOLD ? "verified" : "none";
}

export function evaluateVerificationStatus(text: string): VerificationStatus {
  if (!text || text.trim().length === 0) return "none";
  return text.trim().length > 50 ? "verified" : "unverified";
}
