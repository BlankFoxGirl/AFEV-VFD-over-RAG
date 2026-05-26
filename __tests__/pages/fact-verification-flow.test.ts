import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  insertMany: jest.fn(),
}));
jest.mock("@/lib/models/VerifiedFact", () => ({
  find: jest.fn(),
}));

import extractFactsHandler from "@/pages/api/extract-facts";
import verifyHandler from "@/pages/api/verify";
import Fact from "@/lib/models/Fact";
import VerifiedFact from "@/lib/models/VerifiedFact";

const mockInsertMany = Fact.insertMany as jest.Mock;
const mockFind = VerifiedFact.find as jest.Mock;

function createRequest(method: string, body: unknown): Partial<NextApiRequest> {
  return { method, body };
}

function createResponse(): {
  res: Partial<NextApiResponse>;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Partial<NextApiResponse>, status, json };
}

describe("E2E: fact extraction through verification flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("extracts a fact and verifies it as 'verified' when it matches the database", async () => {
    const factText = "The bridge was built in 1920.";

    mockInsertMany.mockResolvedValueOnce([
      {
        _id: { toString: () => "e2e-fact-1" },
        text: factText,
        context: factText,
        documentId: "doc-e2e",
        documentName: "E2E Test Doc",
      },
    ]);

    const extractReq = createRequest("POST", {
      documentId: "doc-e2e",
      content: factText,
      documentName: "E2E Test Doc",
    });
    const { res: extractRes, status: extractStatus, json: extractJson } = createResponse();
    await extractFactsHandler(extractReq as NextApiRequest, extractRes as NextApiResponse);
    expect(extractStatus).toHaveBeenCalledWith(200);

    const extractedFacts = (extractJson.mock.calls[0][0] as { facts: Array<{ text: string }> }).facts;
    expect(extractedFacts).toHaveLength(1);

    const extractedFactText = extractedFacts[0].text;

    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ text: factText }]),
    });

    const verifyReq = createRequest("POST", { text: extractedFactText });
    const { res: verifyRes, status: verifyStatus, json: verifyJson } = createResponse();
    await verifyHandler(verifyReq as NextApiRequest, verifyRes as NextApiResponse);
    expect(verifyStatus).toHaveBeenCalledWith(200);

    const verificationResult = verifyJson.mock.calls[0][0] as {
      status: string;
      similarity: number;
      matchedFact: string | null;
    };
    expect(verificationResult.status).toBe("verified");
    expect(verificationResult.similarity).toBe(1);
    expect(verificationResult.matchedFact).toBe(factText);
  });

  it("extracts a fact and classifies it as 'unverified' when no database match exists", async () => {
    const factText = "The river contains 500 species of fish.";

    mockInsertMany.mockResolvedValueOnce([
      {
        _id: { toString: () => "e2e-fact-2" },
        text: factText,
        context: factText,
        documentId: "doc-e2e-2",
        documentName: "Biology Doc",
      },
    ]);

    const extractReq = createRequest("POST", {
      documentId: "doc-e2e-2",
      content: factText,
      documentName: "Biology Doc",
    });
    const { res: extractRes, status: extractStatus, json: extractJson } = createResponse();
    await extractFactsHandler(extractReq as NextApiRequest, extractRes as NextApiResponse);
    expect(extractStatus).toHaveBeenCalledWith(200);

    const extractedFactText = (extractJson.mock.calls[0][0] as { facts: Array<{ text: string }> }).facts[0].text;

    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    const verifyReq = createRequest("POST", { text: extractedFactText });
    const { res: verifyRes, json: verifyJson } = createResponse();
    await verifyHandler(verifyReq as NextApiRequest, verifyRes as NextApiResponse);

    const verificationResult = verifyJson.mock.calls[0][0] as {
      status: string;
      matchedFact: string | null;
    };
    expect(verificationResult.status).toBe("unverified");
    expect(verificationResult.matchedFact).toBeNull();
  });

  it("verify endpoint handles a batch of extracted facts without degradation", async () => {
    const facts = [
      "The company was founded in 1994.",
      "The population is 8 billion people.",
      "Water has a boiling point of 100 degrees.",
      "The library contains 2 million books.",
      "The university was founded in 1856.",
    ];

    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue(facts.map((text) => ({ text }))),
    });

    const results = await Promise.all(
      facts.map(async (factText) => {
        const req = createRequest("POST", { text: factText });
        const { res, json } = createResponse();
        await verifyHandler(req as NextApiRequest, res as NextApiResponse);
        return json.mock.calls[0][0] as { status: string; similarity: number };
      }),
    );

    results.forEach((result) => {
      expect(result.status).toBe("verified");
      expect(result.similarity).toBe(1);
    });
  });
});
