jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/VerifiedFact", () => ({
  find: jest.fn(),
}));
jest.mock("@/lib/verification", () => ({
  findBestMatch: jest.fn(),
  classifyFact: jest.fn(),
}));

import { fetchVerifiedFactTexts, resolveVerificationStatus, verifyExtractedClaims } from "@/lib/factVerificationService";
import VerifiedFact from "@/lib/models/VerifiedFact";
import { findBestMatch, classifyFact } from "@/lib/verification";

const mockFind = VerifiedFact.find as jest.Mock;
const mockFindBestMatch = findBestMatch as jest.Mock;
const mockClassifyFact = classifyFact as jest.Mock;

function setupMockFacts(texts: string[]) {
  mockFind.mockReturnValue({
    lean: jest.fn().mockResolvedValue(texts.map((text) => ({ text }))),
  });
}

describe("fetchVerifiedFactTexts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an array of fact text strings", async () => {
    setupMockFacts(["water boils at 100 degrees", "the sun is a star"]);
    const result = await fetchVerifiedFactTexts();
    expect(result).toEqual(["water boils at 100 degrees", "the sun is a star"]);
  });

  it("returns an empty array when no verified facts exist", async () => {
    setupMockFacts([]);
    const result = await fetchVerifiedFactTexts();
    expect(result).toEqual([]);
  });

  it("queries the VerifiedFact model with text projection", async () => {
    setupMockFacts([]);
    await fetchVerifiedFactTexts();
    expect(mockFind).toHaveBeenCalledWith({}, { text: 1 });
  });
});

describe("verifyExtractedClaims", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns none immediately when claims array is empty without querying the database", async () => {
    const result = await verifyExtractedClaims([]);
    expect(result.status).toBe("none");
    expect(result.matchedFact).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("returns none status with zero similarity for empty claims", async () => {
    const result = await verifyExtractedClaims([]);
    expect(result.similarity).toBe(0);
  });

  it("queries the database and returns verified status for matching claims", async () => {
    setupMockFacts(["water boils at 100 degrees celsius"]);
    mockFindBestMatch.mockReturnValue({ similarity: 1, matchedFact: "water boils at 100 degrees celsius" });
    mockClassifyFact.mockReturnValue("verified");

    const result = await verifyExtractedClaims(["water boils at 100 degrees celsius"]);

    expect(result.status).toBe("verified");
    expect(result.similarity).toBe(1);
    expect(mockFind).toHaveBeenCalled();
  });

  it("selects the claim with the highest similarity score", async () => {
    setupMockFacts(["water boils at 100 degrees celsius"]);
    mockFindBestMatch
      .mockReturnValueOnce({ similarity: 0.1, matchedFact: null })
      .mockReturnValueOnce({ similarity: 0.9, matchedFact: "water boils at 100 degrees celsius" });
    mockClassifyFact.mockReturnValue("verified");

    const result = await verifyExtractedClaims(["unrelated claim", "water boils at 100 degrees celsius"]);

    expect(result.similarity).toBe(0.9);
    expect(result.matchedFact).toBe("water boils at 100 degrees celsius");
  });
});

describe("resolveVerificationStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns verified status when fact matches", async () => {
    setupMockFacts(["water boils at 100 degrees celsius"]);
    mockFindBestMatch.mockReturnValue({ similarity: 1, matchedFact: "water boils at 100 degrees celsius" });
    mockClassifyFact.mockReturnValue("verified");

    const result = await resolveVerificationStatus("water boils at 100 degrees celsius");

    expect(result.status).toBe("verified");
    expect(result.similarity).toBe(1);
    expect(result.matchedFact).toBe("water boils at 100 degrees celsius");
  });

  it("returns none status when no match is found", async () => {
    setupMockFacts(["the eiffel tower is in paris"]);
    mockFindBestMatch.mockReturnValue({ similarity: 0, matchedFact: null });
    mockClassifyFact.mockReturnValue("none");

    const result = await resolveVerificationStatus("unknown text");

    expect(result.status).toBe("none");
    expect(result.similarity).toBe(0);
    expect(result.matchedFact).toBeNull();
  });

  it("passes the text and verified fact texts to findBestMatch", async () => {
    const factTexts = ["the bridge was built in 1920"];
    setupMockFacts(factTexts);
    mockFindBestMatch.mockReturnValue({ similarity: 0.5, matchedFact: factTexts[0] });
    mockClassifyFact.mockReturnValue("verified");

    await resolveVerificationStatus("the bridge");

    expect(mockFindBestMatch).toHaveBeenCalledWith("the bridge", factTexts);
  });

  it("returns result with status, similarity, and matchedFact fields", async () => {
    setupMockFacts([]);
    mockFindBestMatch.mockReturnValue({ similarity: 0, matchedFact: null });
    mockClassifyFact.mockReturnValue("none");

    const result = await resolveVerificationStatus("any text");

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("similarity");
    expect(result).toHaveProperty("matchedFact");
  });
});
