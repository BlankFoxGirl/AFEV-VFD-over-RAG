const mockFetch = jest.fn();
global.fetch = mockFetch;

import { fetchChatCompletion, fetchEmbedding, buildChatMessages } from "@/lib/openaiClient";

const FAKE_API_KEY = "sk-test-key";

beforeEach(() => {
  process.env.OPENAI_API_KEY = FAKE_API_KEY;
  mockFetch.mockClear();
});

describe("buildChatMessages", () => {
  it("returns system and user messages in correct order", () => {
    const messages = buildChatMessages("Hello", "You are an assistant.");
    expect(messages).toEqual([
      { role: "system", content: "You are an assistant." },
      { role: "user", content: "Hello" },
    ]);
  });

  it("includes the user message verbatim", () => {
    const userMessage = "What is the capital of France?";
    const messages = buildChatMessages(userMessage, "System prompt");
    expect(messages[1].content).toBe(userMessage);
  });

  it("includes the system prompt verbatim", () => {
    const systemPrompt = "Be concise and accurate.";
    const messages = buildChatMessages("Hello", systemPrompt);
    expect(messages[0].content).toBe(systemPrompt);
  });

  it("always produces exactly two messages", () => {
    const messages = buildChatMessages("test", "prompt");
    expect(messages).toHaveLength(2);
  });
});

describe("fetchChatCompletion", () => {
  function mockSuccessfulChatResponse(content: string) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content } }],
      }),
    });
  }

  function mockFailedResponse(status: number) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      statusText: "Error",
    });
  }

  it("calls the OpenAI chat completions endpoint", async () => {
    mockSuccessfulChatResponse("Hello!");
    await fetchChatCompletion([{ role: "user", content: "Hi" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends the Authorization header with the API key", async () => {
    mockSuccessfulChatResponse("Reply");
    await fetchChatCompletion([]);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe(`Bearer ${FAKE_API_KEY}`);
  });

  it("returns the assistant message content from the response", async () => {
    mockSuccessfulChatResponse("Paris is the capital of France.");
    const result = await fetchChatCompletion([{ role: "user", content: "Capital of France?" }]);
    expect(result).toBe("Paris is the capital of France.");
  });

  it("sends messages in the request body", async () => {
    const messages = [{ role: "user" as const, content: "test" }];
    mockSuccessfulChatResponse("ok");
    await fetchChatCompletion(messages);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages).toEqual(messages);
  });

  it("throws an error when the API returns a non-ok status", async () => {
    mockFailedResponse(429);
    await expect(fetchChatCompletion([])).rejects.toThrow("OpenAI API error: 429");
  });
});

describe("fetchEmbedding", () => {
  function mockSuccessfulEmbeddingResponse(embedding: number[]) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding }],
      }),
    });
  }

  it("calls the OpenAI embeddings endpoint", async () => {
    mockSuccessfulEmbeddingResponse([0.1, 0.2, 0.3]);
    await fetchEmbedding("test text");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns the embedding vector from the response", async () => {
    const expectedEmbedding = [0.1, 0.2, 0.3];
    mockSuccessfulEmbeddingResponse(expectedEmbedding);
    const result = await fetchEmbedding("test text");
    expect(result).toEqual(expectedEmbedding);
  });

  it("sends the input text in the request body", async () => {
    mockSuccessfulEmbeddingResponse([]);
    await fetchEmbedding("embed this");
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.input).toBe("embed this");
  });

  it("sends the Authorization header with the API key", async () => {
    mockSuccessfulEmbeddingResponse([]);
    await fetchEmbedding("text");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe(`Bearer ${FAKE_API_KEY}`);
  });

  it("throws an error when the API returns a non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });
    await expect(fetchEmbedding("text")).rejects.toThrow("OpenAI API error: 401");
  });
});
