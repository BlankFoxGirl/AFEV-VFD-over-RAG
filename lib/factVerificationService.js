import connectToDatabase from "@/lib/db";
import VerifiedFact from "@/lib/models/VerifiedFact";
import { findBestMatch, classifyFact } from "@/lib/verification";

export async function fetchVerifiedFactTexts() {
  await connectToDatabase();
  const facts = await VerifiedFact.find({}, { text: 1 }).lean();
  return facts.map((f) => f.text);
}

export async function resolveVerificationStatus(text) {
  const verifiedFactTexts = await fetchVerifiedFactTexts();
  const match = findBestMatch(text, verifiedFactTexts);
  return {
    status: classifyFact(match.similarity),
    similarity: match.similarity,
    matchedFact: match.matchedFact,
  };
}
