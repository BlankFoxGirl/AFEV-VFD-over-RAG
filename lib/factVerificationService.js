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
  const matchedFactDoc = findMatchedFactDoc(facts, match.matchedFact);
  return {
    status: classifyFact(match.similarity),
    similarity: match.similarity,
    matchedFact: match.matchedFact,
    source: matchedFactDoc?.source ?? null,
    category: matchedFactDoc?.category ?? null,
    notes: matchedFactDoc?.notes ?? null,
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
