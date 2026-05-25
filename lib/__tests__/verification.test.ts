import {
  computeTextSimilarity,
  findBestMatch,
  classifyFact,
  evaluateVerificationStatus,
} from "@/lib/verification";

describe("computeTextSimilarity", () => {
  it("returns 1 for identical texts", () => {
    expect(computeTextSimilarity("water is a liquid", "water is a liquid")).toBe(1);
  });

  it("returns 0 for completely different texts", () => {
    expect(computeTextSimilarity("cats are animals", "programming language syntax")).toBe(0);
  });

  it("returns a value between 0 and 1 for partially similar texts", () => {
    const similarity = computeTextSimilarity(
      "the bridge was built in 1920",
      "the bridge was constructed in 1920",
    );
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("is case insensitive during comparison", () => {
    const lower = computeTextSimilarity("water is wet", "water is wet");
    const mixed = computeTextSimilarity("Water Is Wet", "WATER IS WET");
    expect(lower).toBe(mixed);
  });

  it("ignores punctuation when computing similarity", () => {
    const withPunct = computeTextSimilarity("water, is wet.", "water is wet");
    expect(withPunct).toBe(1);
  });

  it("returns 1 for two empty strings", () => {
    expect(computeTextSimilarity("", "")).toBe(1);
  });
});

describe("findBestMatch", () => {
  it("returns zero similarity and null matchedFact when verifiedFacts is empty", () => {
    const result = findBestMatch("any text", []);
    expect(result).toEqual({ similarity: 0, matchedFact: null });
  });

  it("finds the closest matching verified fact", () => {
    const verifiedFacts = [
      "the eiffel tower is in paris",
      "water boils at 100 degrees celsius",
      "the sun is a star",
    ];
    const result = findBestMatch("water boils at 100 degrees", verifiedFacts);
    expect(result.matchedFact).toBe("water boils at 100 degrees celsius");
    expect(result.similarity).toBeGreaterThan(0);
  });

  it("returns the best match even when multiple candidates partially match", () => {
    const verifiedFacts = [
      "the bridge was built in 1920",
      "the tunnel was built in 1920",
    ];
    const result = findBestMatch("the bridge was built in 1920", verifiedFacts);
    expect(result.matchedFact).toBe("the bridge was built in 1920");
    expect(result.similarity).toBe(1);
  });

  it("returns a match result with both similarity and matchedFact fields", () => {
    const result = findBestMatch("water is wet", ["water is wet"]);
    expect(result).toHaveProperty("similarity");
    expect(result).toHaveProperty("matchedFact");
  });

  it("handles a single verified fact", () => {
    const result = findBestMatch("the earth orbits the sun", ["the earth orbits the sun"]);
    expect(result.similarity).toBe(1);
    expect(result.matchedFact).toBe("the earth orbits the sun");
  });

  it("handles fact text with no overlap against any verified fact", () => {
    const result = findBestMatch("xyz abc def", ["the bridge was built in 1920"]);
    expect(result.similarity).toBe(0);
  });
});

describe("classifyFact", () => {
  it("returns 'verified' when similarity meets the threshold", () => {
    expect(classifyFact(0.3)).toBe("verified");
  });

  it("returns 'verified' when similarity exceeds the threshold", () => {
    expect(classifyFact(0.8)).toBe("verified");
  });

  it("returns 'unverified' when similarity is below the threshold", () => {
    expect(classifyFact(0.1)).toBe("unverified");
  });

  it("returns 'unverified' for zero similarity", () => {
    expect(classifyFact(0)).toBe("unverified");
  });

  it("returns 'verified' for perfect similarity", () => {
    expect(classifyFact(1)).toBe("verified");
  });
});

describe("evaluateVerificationStatus (legacy)", () => {
  it("returns 'none' for empty string", () => {
    expect(evaluateVerificationStatus("")).toBe("none");
  });

  it("returns 'none' for whitespace-only string", () => {
    expect(evaluateVerificationStatus("   ")).toBe("none");
  });

  it("returns 'verified' for text longer than 50 characters", () => {
    const longText = "This is a long fact that exceeds fifty characters in length.";
    expect(evaluateVerificationStatus(longText)).toBe("verified");
  });

  it("returns 'unverified' for text with 50 or fewer characters", () => {
    expect(evaluateVerificationStatus("Short fact.")).toBe("unverified");
  });
});
