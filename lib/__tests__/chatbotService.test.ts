jest.mock("@/lib/factVerificationService", () => ({
  resolveVerificationStatus: jest.fn(),
  fetchVerifiedFactTexts: jest.fn(),
}));

jest.mock("@/lib/openaiClient", () => ({
  fetchChatCompletion: jest.fn(),
  buildChatMessages: jest.fn((userMessage, systemPrompt) => [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]),
}));

jest.mock("@/lib/embeddingService", () => ({
  generateEmbeddingContext: jest.fn(),
}));

import {
  buildBaseReply,
  appendStatusFlag,
  buildSystemPrompt,
  processMessage,
} from "@/lib/chatbotService";
import { resolveVerificationStatus, fetchVerifiedFactTexts } from "@/lib/factVerificationService";
import { fetchChatCompletion } from "@/lib/openaiClient";
import { generateEmbeddingContext } from "@/lib/embeddingService";

const mockResolveVerificationStatus = resolveVerificationStatus as jest.Mock;
const mockFetchVerifiedFactTexts = fetchVerifiedFactTexts as jest.Mock;
const mockFetchChatCompletion = fetchChatCompletion as jest.Mock;
const mockGenerateEmbeddingContext = generateEmbeddingContext as jest.Mock;

describe("buildBaseReply", () => {
  it("includes the user message in the reply", () => {
    const reply = buildBaseReply("What is water?");
    expect(reply).toContain("What is water?");
  });

  it("returns a non-empty string", () => {
    const reply = buildBaseReply("test");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("wraps the user message in quotes", () => {
    const reply = buildBaseReply("Is the sun a star?");
    expect(reply).toContain('"Is the sun a star?"');
  });
});

describe("appendStatusFlag", () => {
  it("appends [Verified] flag for verified status", () => {
    const result = appendStatusFlag("Some reply.", "verified");
    expect(result).toBe("Some reply. [Verified]");
  });

  it("appends [Unverified] flag for unverified status", () => {
    const result = appendStatusFlag("Some reply.", "unverified");
    expect(result).toBe("Some reply. [Unverified]");
  });

  it("returns reply unchanged for checking status", () => {
    const result = appendStatusFlag("Some reply.", "checking");
    expect(result).toBe("Some reply.");
  });

  it("returns reply unchanged for none status", () => {
    const result = appendStatusFlag("Some reply.", "none");
    expect(result).toBe("Some reply.");
  });

  it("preserves the original reply content before the flag", () => {
    const reply = "The bridge was built in 1920.";
    const result = appendStatusFlag(reply, "verified");
    expect(result).toContain("The bridge was built in 1920.");
    expect(result).toContain("[Verified]");
  });
});

describe("buildSystemPrompt", () => {
  it("returns a base prompt when no embedding context is provided", () => {
    const prompt = buildSystemPrompt("");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes the embedding context when provided", () => {
    const context = "Verified facts for context:\nWater boils at 100°C";
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain(context);
  });

  it("returns only the base prompt when context is empty string", () => {
    const basePrompt = buildSystemPrompt("");
    const promptWithContext = buildSystemPrompt("some context");
    expect(promptWithContext.length).toBeGreaterThan(basePrompt.length);
  });
});

describe("processMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupVerification(status: string) {
    mockResolveVerificationStatus.mockResolvedValue({
      status,
      similarity: 1,
      matchedFact: null,
    });
  }

  it("returns reply from ChatGPT with [Verified] flag when verification is verified", async () => {
    setupVerification("verified");
    mockFetchVerifiedFactTexts.mockResolvedValue(["water is H2O"]);
    mockGenerateEmbeddingContext.mockResolvedValue("Verified facts for context:\nwater is H2O");
    mockFetchChatCompletion.mockResolvedValue("Water is the molecule H2O.");

    const result = await processMessage("What is water?");

    expect(result.reply).toContain("[Verified]");
    expect(result.reply).toContain("Water is the molecule H2O.");
    expect(result.verificationStatus).toBe("verified");
  });

  it("returns ChatGPT reply with [Unverified] flag when verification is unverified", async () => {
    setupVerification("unverified");
    mockFetchVerifiedFactTexts.mockResolvedValue([]);
    mockGenerateEmbeddingContext.mockResolvedValue("");
    mockFetchChatCompletion.mockResolvedValue("I am not sure about that claim.");

    const result = await processMessage("unknown claim");

    expect(result.reply).toContain("[Unverified]");
    expect(result.verificationStatus).toBe("unverified");
  });

  it("falls back to buildBaseReply when ChatGPT throws an error", async () => {
    setupVerification("unverified");
    mockFetchVerifiedFactTexts.mockResolvedValue([]);
    mockGenerateEmbeddingContext.mockResolvedValue("");
    mockFetchChatCompletion.mockRejectedValue(new Error("API rate limit"));

    const result = await processMessage("some question");

    expect(result.reply).toContain("some question");
    expect(result).toHaveProperty("verificationStatus");
  });

  it("calls fetchVerifiedFactTexts to build embedding context", async () => {
    setupVerification("verified");
    mockFetchVerifiedFactTexts.mockResolvedValue(["the sun is a star"]);
    mockGenerateEmbeddingContext.mockResolvedValue("Verified facts for context:\nthe sun is a star");
    mockFetchChatCompletion.mockResolvedValue("Yes, the sun is a star.");

    await processMessage("Is the sun a star?");

    expect(mockFetchVerifiedFactTexts).toHaveBeenCalled();
  });

  it("returns both reply and verificationStatus fields", async () => {
    setupVerification("unverified");
    mockFetchVerifiedFactTexts.mockResolvedValue([]);
    mockGenerateEmbeddingContext.mockResolvedValue("");
    mockFetchChatCompletion.mockResolvedValue("Some reply.");

    const result = await processMessage("some message");

    expect(result).toHaveProperty("reply");
    expect(result).toHaveProperty("verificationStatus");
  });

  it("passes the embedding context to ChatGPT for contextual responses", async () => {
    setupVerification("verified");
    const facts = ["Mars is the fourth planet"];
    const embeddingContext = "Verified facts for context:\nMars is the fourth planet";
    mockFetchVerifiedFactTexts.mockResolvedValue(facts);
    mockGenerateEmbeddingContext.mockResolvedValue(embeddingContext);
    mockFetchChatCompletion.mockResolvedValue("Mars is indeed the fourth planet.");

    await processMessage("Tell me about Mars.");

    expect(mockGenerateEmbeddingContext).toHaveBeenCalledWith("Tell me about Mars.", facts);
  });
});
