export type ExtractedFact = {
  text: string;
  context: string;
  documentId: string;
};

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z])/;

function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);
}

const FACTUAL_PATTERNS = [
  /\d+/,
  /\b(is|are|was|were|has|have|had|contains|consists|includes|provides|produces|requires|causes)\b/i,
  /\b(percent|million|billion|thousand|hundred)\b/i,
  /\b(founded|established|created|discovered|invented|developed|located|born)\b/i,
];

function isQuestion(sentence: string): boolean {
  return sentence.trimEnd().endsWith("?");
}

function isFactualSentence(sentence: string): boolean {
  if (isQuestion(sentence)) return false;
  return FACTUAL_PATTERNS.some((pattern) => pattern.test(sentence));
}

function buildContext(sentences: string[], targetIndex: number): string {
  const start = Math.max(0, targetIndex - 1);
  const end = Math.min(sentences.length - 1, targetIndex + 1);
  return sentences.slice(start, end + 1).join(" ");
}

export function extractFacts(
  content: string,
  documentId: string,
): ExtractedFact[] {
  const sentences = splitIntoSentences(content);
  return sentences
    .flatMap((sentence, index) =>
      isFactualSentence(sentence)
        ? [
            {
              text: sentence,
              context: buildContext(sentences, index),
              documentId,
            },
          ]
        : [],
    );
}
