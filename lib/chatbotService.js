import { resolveVerificationStatus, fetchVerifiedFactTexts } from "@/lib/factVerificationService";
import { fetchChatCompletion, buildChatMessages } from "@/lib/openaiClient";
import { generateEmbeddingContext } from "@/lib/embeddingService";

const VERIFICATION_FLAGS = {
  verified: "Verified",
  unverified: "Unverified",
};

export function buildBaseReply(userMessage) {
  return (
    `You asked: "${userMessage}". ` +
    "This is a placeholder response from the FactCheck assistant. " +
    "Connect an AI service for real fact-checked answers."
  );
}

export function appendStatusFlag(reply, verificationStatus) {
  const flag = VERIFICATION_FLAGS[verificationStatus];
  return flag ? `${reply} [${flag}]` : reply;
}

export function buildSystemPrompt(embeddingContext) {
  const base = "You are a helpful fact-checking assistant. Answer concisely and accurately.";
  return embeddingContext ? `${base}\n\n${embeddingContext}` : base;
}

async function fetchChatGptReply(userMessage, embeddingContext) {
  const systemPrompt = buildSystemPrompt(embeddingContext);
  const messages = buildChatMessages(userMessage, systemPrompt);
  return fetchChatCompletion(messages);
}

async function buildContextForMessage(userMessage) {
  const verifiedFacts = await fetchVerifiedFactTexts();
  return generateEmbeddingContext(userMessage, verifiedFacts);
}

async function getReply(userMessage) {
  try {
    const embeddingContext = await buildContextForMessage(userMessage);
    return await fetchChatGptReply(userMessage, embeddingContext);
  } catch {
    return buildBaseReply(userMessage);
  }
}

export async function processMessage(userMessage) {
  const [reply, verification] = await Promise.all([
    getReply(userMessage),
    resolveVerificationStatus(userMessage),
  ]);

  return {
    reply: appendStatusFlag(reply, verification.status),
    verificationStatus: verification.status,
    matchedFact: verification.matchedFact ?? null,
  };
}
