const OPENAI_API_BASE = "https://api.openai.com/v1";
const CHAT_MODEL = "gpt-3.5-turbo";
const EMBEDDING_MODEL = "text-embedding-ada-002";

function getApiKey() {
  return process.env.OPENAI_API_KEY;
}

async function postToOpenAI(endpoint, body) {
  const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function buildChatMessages(userMessage, systemPrompt) {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}

export async function fetchChatCompletion(messages) {
  const data = await postToOpenAI("/chat/completions", {
    model: CHAT_MODEL,
    messages,
  });
  return data.choices[0].message.content;
}

export async function fetchEmbedding(text) {
  const data = await postToOpenAI("/embeddings", {
    model: EMBEDDING_MODEL,
    input: text,
  });
  return data.data[0].embedding;
}
