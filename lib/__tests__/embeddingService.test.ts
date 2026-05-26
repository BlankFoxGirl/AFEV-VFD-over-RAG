jest.mock("@/lib/openaiClient", () => ({
  fetchEmbedding: jest.fn(),
}));

import { generateEmbedding, buildEmbeddingContext, generateEmbeddingContext } from "@/lib/embeddingService";
import { fetchEmbedding } from "@/lib/openaiClient";

const mockFetchEmbedding = fetchEmbedding as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("buildEmbeddingContext", () => {
  it("returns an empty string when facts array is empty", () => {
    expect(buildEmbeddingContext([])).toBe("");
  });

  it("returns an empty string when facts is null", () => {
    expect(buildEmbeddingContext(null as unknown as string[])).toBe("");
  });

  it("includes each fact on its own line", () => {
    const facts = ["Water boils at 100°C", "The sun is a star"];
    const context = buildEmbeddingContext(facts);
    expect(context).toContain("Water boils at 100°C");
    expect(context).toContain("The sun is a star");
  });

  it("prefixes the context with a label", () => {
    const context = buildEmbeddingContext(["Some fact"]);
    expect(context).toContain("Verified facts for context:");
  });
});

describe("generateEmbedding", () => {
  it("calls fetchEmbedding with the provided text", async () => {
    mockFetchEmbedding.mockResolvedValue([0.1, 0.2]);
    await generateEmbedding("hello world");
    expect(mockFetchEmbedding).toHaveBeenCalledWith("hello world");
  });

  it("returns the embedding vector from fetchEmbedding", async () => {
    const embedding = [0.5, 0.6, 0.7];
    mockFetchEmbedding.mockResolvedValue(embedding);
    const result = await generateEmbedding("test");
    expect(result).toEqual(embedding);
  });
});

describe("generateEmbeddingContext", () => {
  it("returns empty string when verifiedFacts is empty", async () => {
    const result = await generateEmbeddingContext("hello", []);
    expect(result).toBe("");
    expect(mockFetchEmbedding).not.toHaveBeenCalled();
  });

  it("calls generateEmbedding with the user message when facts exist", async () => {
    mockFetchEmbedding.mockResolvedValue([0.1, 0.2]);
    await generateEmbeddingContext("What is water?", ["Water boils at 100°C"]);
    expect(mockFetchEmbedding).toHaveBeenCalledWith("What is water?");
  });

  it("returns a context string that includes the verified facts", async () => {
    mockFetchEmbedding.mockResolvedValue([0.1]);
    const result = await generateEmbeddingContext("query", ["fact one", "fact two"]);
    expect(result).toContain("fact one");
    expect(result).toContain("fact two");
  });
});
