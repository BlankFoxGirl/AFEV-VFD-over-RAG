import {
  buildChatMessages,
  fetchChatCompletion,
} from "@/lib/openaiClient";

export type ExtractedFact = {
  text: string;
  context: string;
  documentId: string;
};

const SYSTEM_PROMPT =
  "You are an expert at identifying factual claims in text. " +
  "Extract every specific, objective, verifiable claim from the document provided by the user. " +
  "Return one claim per line. " +
  "Do not include opinions, questions, or vague statements. " +
  "Do not add numbering, bullet points, or any other formatting -- plain text only.";

const MAX_CONTEXT_LENGTH = 2000;

function parseClaimsFromResponse(response: string): string[] {
  return response
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildContext(content: string): string {
  return content.length > MAX_CONTEXT_LENGTH
    ? content.slice(0, MAX_CONTEXT_LENGTH) + "..."
    : content;
}

export async function extractFacts(
  content: string,
  documentId: string,
): Promise<ExtractedFact[]> {
  if (!content.trim()) return [];

  const messages = buildChatMessages(content, SYSTEM_PROMPT);
  const response = await fetchChatCompletion(messages);
  const claims = parseClaimsFromResponse(response);
  const context = buildContext(content);

  return claims.map((text) => ({ text, context, documentId }));
}

export async function extractClaimsFromText(content: string): Promise<string[]> {
  const facts = await extractFacts(content, "");
  return facts.map((f) => f.text);
}
