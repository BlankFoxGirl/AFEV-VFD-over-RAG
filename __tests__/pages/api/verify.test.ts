import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/verify";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/VerifiedFact", () => ({
  find: jest.fn(),
}));
jest.mock("@/lib/models/Fact", () => ({
  findByIdAndUpdate: jest.fn(),
}));

import VerifiedFact from "@/lib/models/VerifiedFact";
import Fact from "@/lib/models/Fact";

const mockFind = VerifiedFact.find as jest.Mock;
const mockFindByIdAndUpdate = Fact.findByIdAndUpdate as jest.Mock;

function createMockRequest(
  method: string,
  body: unknown,
): Partial<NextApiRequest> {
  return { method, body };
}

function createMockResponse(): {
  res: Partial<NextApiResponse>;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Partial<NextApiResponse>, status, json };
}

function setupMockVerifiedFacts(factTexts: string[]) {
  mockFind.mockReturnValue({
    lean: jest.fn().mockResolvedValue(
      factTexts.map((text) => ({ text })),
    ),
  });
}

function setupMockFactUpdate(returnValue: unknown) {
  mockFindByIdAndUpdate.mockReturnValue({
    lean: jest.fn().mockResolvedValue(returnValue),
  });
}

describe("POST /api/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "debug").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 405 for non-POST methods", async () => {
    const req = createMockRequest("GET", {});
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("returns 400 when text is missing from body", async () => {
    setupMockVerifiedFacts([]);
    const req = createMockRequest("POST", {});
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "text must be a non-empty string" });
  });

  it("returns 400 when text is not a string", async () => {
    setupMockVerifiedFacts([]);
    const req = createMockRequest("POST", { text: 123 });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "text must be a non-empty string" });
  });

  it("returns 400 for empty body", async () => {
    const req = createMockRequest("POST", null);
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("classifies a matching fact as 'verified'", async () => {
    setupMockVerifiedFacts(["water boils at 100 degrees celsius"]);
    const req = createMockRequest("POST", { text: "water boils at 100 degrees celsius" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as {
      text: string;
      status: string;
      similarity: number;
      matchedFact: string | null;
    };
    expect(response.status).toBe("verified");
    expect(response.similarity).toBe(1);
    expect(response.matchedFact).toBe("water boils at 100 degrees celsius");
  });

  it("classifies an unmatched fact as 'unverified'", async () => {
    setupMockVerifiedFacts(["the eiffel tower is in paris"]);
    const req = createMockRequest("POST", { text: "quantum mechanics governs subatomic particles" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { status: string; similarity: number };
    expect(response.status).toBe("unverified");
    expect(response.similarity).toBe(0);
  });

  it("returns 'unverified' with null matchedFact when database has no verified facts", async () => {
    setupMockVerifiedFacts([]);
    const req = createMockRequest("POST", { text: "any fact text here" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as {
      status: string;
      similarity: number;
      matchedFact: string | null;
    };
    expect(response.status).toBe("unverified");
    expect(response.matchedFact).toBeNull();
  });

  it("includes text, status, similarity, and matchedFact in response", async () => {
    setupMockVerifiedFacts(["the sun is a star"]);
    const req = createMockRequest("POST", { text: "the sun is a star" });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty("text");
    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("similarity");
    expect(response).toHaveProperty("matchedFact");
  });

  it("echoes the submitted text back in the response", async () => {
    setupMockVerifiedFacts([]);
    const factText = "the river is 300 miles long";
    const req = createMockRequest("POST", { text: factText });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0] as { text: string };
    expect(response.text).toBe(factText);
  });

  it("returns 500 when database throws an error", async () => {
    mockFind.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB connection failed")),
    });
    const req = createMockRequest("POST", { text: "some fact text" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to verify fact" });
  });

  it("picks the best match from multiple verified facts", async () => {
    setupMockVerifiedFacts([
      "the moon orbits the earth",
      "water boils at 100 degrees celsius",
      "the earth orbits the sun",
    ]);
    const req = createMockRequest("POST", { text: "the moon orbits the earth" });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0] as { matchedFact: string; status: string };
    expect(response.matchedFact).toBe("the moon orbits the earth");
    expect(response.status).toBe("verified");
  });

  it("outputs a console.debug log for every request", async () => {
    setupMockVerifiedFacts([]);
    const req = createMockRequest("POST", { text: "some claim" });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining("[verify]"),
    );
  });

  it("outputs a console.debug log even for non-POST methods", async () => {
    const req = createMockRequest("GET", {});
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining("[verify]"),
    );
  });

  it("logs an error via console.error when the database throws", async () => {
    mockFind.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB connection failed")),
    });
    const req = createMockRequest("POST", { text: "some fact text" });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[verify]"),
    );
  });

  it("updates Fact verificationStatus when valid factId is provided", async () => {
    setupMockVerifiedFacts(["the sky is blue"]);
    setupMockFactUpdate({ _id: "fact-abc", verificationStatus: "verified" });
    const req = createMockRequest("POST", {
      text: "the sky is blue",
      factId: "fact-abc",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "fact-abc",
      { $set: { verificationStatus: "verified" } },
      { new: true },
    );
  });

  it("updates Fact verificationStatus to 'unverified' for a non-matching fact", async () => {
    setupMockVerifiedFacts(["the eiffel tower is in paris"]);
    setupMockFactUpdate({ _id: "fact-xyz", verificationStatus: "unverified" });
    const req = createMockRequest("POST", {
      text: "quantum mechanics governs subatomic particles",
      factId: "fact-xyz",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "fact-xyz",
      { $set: { verificationStatus: "unverified" } },
      { new: true },
    );
  });

  it("returns 404 when factId references a non-existent Fact", async () => {
    setupMockVerifiedFacts(["the sky is blue"]);
    setupMockFactUpdate(null);
    const req = createMockRequest("POST", {
      text: "the sky is blue",
      factId: "nonexistent-id",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Fact not found") }),
    );
  });

  it("does not call Fact.findByIdAndUpdate when no factId is provided", async () => {
    setupMockVerifiedFacts(["the sun is a star"]);
    const req = createMockRequest("POST", { text: "the sun is a star" });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 when Fact.findByIdAndUpdate throws an unexpected error", async () => {
    setupMockVerifiedFacts(["water covers 71 percent of the earth"]);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB write failure")),
    });
    const req = createMockRequest("POST", {
      text: "water covers 71 percent of the earth",
      factId: "fact-123",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to verify fact" });
  });
});
