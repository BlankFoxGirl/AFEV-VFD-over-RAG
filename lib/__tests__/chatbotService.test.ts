jest.mock("@/lib/factVerificationService", () => ({
  resolveVerificationStatus: jest.fn(),
}));

import { buildBaseReply, appendStatusFlag, processMessage } from "@/lib/chatbotService";
import { resolveVerificationStatus } from "@/lib/factVerificationService";

const mockResolveVerificationStatus = resolveVerificationStatus as jest.Mock;

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

describe("processMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns reply with [Verified] flag when verification status is verified", async () => {
    mockResolveVerificationStatus.mockResolvedValue({
      status: "verified",
      similarity: 1,
      matchedFact: "water is wet",
    });

    const result = await processMessage("water is wet");

    expect(result.reply).toContain("[Verified]");
    expect(result.verificationStatus).toBe("verified");
  });

  it("returns reply with [Unverified] flag when verification status is unverified", async () => {
    mockResolveVerificationStatus.mockResolvedValue({
      status: "unverified",
      similarity: 0,
      matchedFact: null,
    });

    const result = await processMessage("unknown claim");

    expect(result.reply).toContain("[Unverified]");
    expect(result.verificationStatus).toBe("unverified");
  });

  it("includes the user message content in the reply", async () => {
    mockResolveVerificationStatus.mockResolvedValue({
      status: "verified",
      similarity: 0.8,
      matchedFact: "the sun is a star",
    });

    const result = await processMessage("the sun is a star");

    expect(result.reply).toContain("the sun is a star");
  });

  it("returns both reply and verificationStatus fields", async () => {
    mockResolveVerificationStatus.mockResolvedValue({
      status: "unverified",
      similarity: 0,
      matchedFact: null,
    });

    const result = await processMessage("some message");

    expect(result).toHaveProperty("reply");
    expect(result).toHaveProperty("verificationStatus");
  });

  it("calls resolveVerificationStatus with the user message", async () => {
    mockResolveVerificationStatus.mockResolvedValue({
      status: "verified",
      similarity: 1,
      matchedFact: null,
    });

    await processMessage("hello");

    expect(mockResolveVerificationStatus).toHaveBeenCalledWith("hello");
  });
});
