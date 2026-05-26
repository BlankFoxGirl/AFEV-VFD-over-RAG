import connectToDatabase from "@/lib/db";
import VerifiedFact from "@/lib/models/VerifiedFact";
import { findBestMatch, classifyFact } from "@/lib/verification";

export async function fetchVerifiedFactTexts() {
  await connectToDatabase();
  const facts = await VerifiedFact.find({}, { text: 1 }).lean();
  return facts.map((f) => f.text);
}

async function fetchVerifiedFactsWithDetail() {
  await connectToDatabase();
  return VerifiedFact.find({}, { text: 1, source: 1, category: 1, notes: 1 }).lean();
}

function findMatchedFactDoc(facts, matchedFactText) {
  if (!matchedFactText) return null;
  return facts.find((f) => f.text === matchedFactText) ?? null;
}

export async function resolveVerificationStatus(text) {
  const facts = await fetchVerifiedFactsWithDetail();
  const texts = facts.map((f) => f.text);
  const match = findBestMatch(text, texts);
  const status = classifyFact(match.similarity);
  const matchedFactDoc = findMatchedFactDoc(facts, match.matchedFact);

  console.log(`[factVerificationService] resolveVerificationStatus: text="${text.substring(0, 80)}" factCount=${facts.length} similarity=${match.similarity} status=${status}`);

  return {
    status,
    similarity: match.similarity,
    matchedFact: match.matchedFact,
    source: matchedFactDoc?.source ?? null,
    category: matchedFactDoc?.category ?? null,
    notes: matchedFactDoc?.notes ?? null,
  };
}

export async function verifyExtractedClaims(claims) {
  console.log(`[factVerificationService] verifyExtractedClaims: claimsCount=${claims.length}`);
  if (!claims.length) return { status: "none", matchedFact: null, similarity: 0, source: null, category: null, notes: null };
  const facts = await fetchVerifiedFactsWithDetail();
  const texts = facts.map((f) => f.text);

  let best = { similarity: 0, matchedFact: null };
  for (const claim of claims) {
    const match = findBestMatch(claim, texts);
    if (match.similarity > best.similarity) best = match;
  }

  const matchedDoc = findMatchedFactDoc(facts, best.matchedFact);
  return {
    status: classifyFact(best.similarity),
    similarity: best.similarity,
    matchedFact: best.matchedFact,
    source: matchedDoc?.source ?? null,
    category: matchedDoc?.category ?? null,
    notes: matchedDoc?.notes ?? null,
  };
}

export async function fetchVerifiedFactDetail(factText) {
  await connectToDatabase();
  const fact = await VerifiedFact.findOne({ text: factText }, { text: 1, source: 1, category: 1, notes: 1 }).lean();
  if (!fact) return null;
  return {
    matchedFact: fact.text,
    source: fact.source ?? null,
    category: fact.category ?? null,
    notes: fact.notes ?? null,
  };
}
