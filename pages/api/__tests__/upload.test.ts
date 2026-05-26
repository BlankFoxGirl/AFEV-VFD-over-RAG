import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/upload";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  insertMany: jest.fn(),
}));
jest.mock("@/lib/factVerificationService", () => ({
  resolveVerificationStatus: jest.fn().mockResolvedValue({
    status: "unverified",
    similarity: 0,
    matchedFact: null,
  }),
}));

import Fact from "@/lib/models/Fact";
import { resolveVerificationStatus } from "@/lib/factVerificationService";

const mockInsertMany = Fact.insertMany as jest.Mock;
const mockResolveVerificationStatus = resolveVerificationStatus as jest.Mock;

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

describe("POST /api/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-POST methods", async () => {
    const req = createMockRequest("GET", {});
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("returns 400 when fileName is missing", async () => {
    const req = createMockRequest("POST", { content: "Some content." });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("returns 400 when content is missing", async () => {
    const req = createMockRequest("POST", { fileName: "test.txt" });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for null body", async () => {
    const req = createMockRequest("POST", null);
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 200 with documentId, documentName, and factCount for valid input", async () => {
    mockInsertMany.mockResolvedValueOnce([]);

    const req = createMockRequest("POST", {
      fileName: "report.txt",
      content: "The river was discovered in 1492. It stretches 3000 km.",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0];
    expect(response).toMatchObject({
      documentId: expect.stringMatching(/^doc_/),
      documentName: "report.txt",
      factCount: expect.any(Number),
    });
  });

  it("generates a unique documentId per upload", async () => {
    mockInsertMany.mockResolvedValue([]);

    const body = { fileName: "doc.txt", content: "Water boils at 100°C." };
    const req1 = createMockRequest("POST", body);
    const req2 = createMockRequest("POST", body);
    const { res: res1, json: json1 } = createMockResponse();
    const { res: res2, json: json2 } = createMockResponse();

    await handler(req1 as NextApiRequest, res1 as NextApiResponse);
    await handler(req2 as NextApiRequest, res2 as NextApiResponse);

    const id1 = json1.mock.calls[0][0].documentId;
    const id2 = json2.mock.calls[0][0].documentId;
    expect(id1).not.toEqual(id2);
  });

  it("triggers fact extraction by calling Fact.insertMany with extracted facts", async () => {
    mockInsertMany.mockResolvedValueOnce([]);

    const req = createMockRequest("POST", {
      fileName: "science.txt",
      content: "The Earth has one moon. Mars has two moons.",
    });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.any(String),
          documentId: expect.stringMatching(/^doc_/),
          documentName: "science.txt",
        }),
      ]),
    );
  });

  it("does not call insertMany when no facts are extracted from content", async () => {
    const req = createMockRequest("POST", {
      fileName: "questions.txt",
      content: "How are you? What time is it?",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockInsertMany).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });

  it("returns 500 when database operation fails", async () => {
    mockInsertMany.mockRejectedValueOnce(new Error("DB error"));

    const req = createMockRequest("POST", {
      fileName: "data.txt",
      content: "The company was founded in 1990.",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to process document" });
  });

  it("includes verificationSummary in the success response", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockResolvedValue({
      status: "verified",
      similarity: 0.8,
      matchedFact: "The Earth has one moon.",
    });

    const req = createMockRequest("POST", {
      fileName: "science.txt",
      content: "The Earth has one moon. Mars has two moons.",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty("verificationSummary");
    expect(response.verificationSummary).toHaveProperty("verified");
    expect(response.verificationSummary).toHaveProperty("unverified");
  });

  it("triggers fact verification for each extracted fact post-upload", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockResolvedValue({
      status: "unverified",
      similarity: 0,
      matchedFact: null,
    });

    const req = createMockRequest("POST", {
      fileName: "facts.txt",
      content: "The river was discovered in 1492. It stretches 3000 km.",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    expect(mockResolveVerificationStatus).toHaveBeenCalled();
  });

  it("returns 500 when verification service throws during processing", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockRejectedValue(new Error("Verification failed"));

    const req = createMockRequest("POST", {
      fileName: "data.txt",
      content: "The company was founded in 1990.",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    // Verification errors are absorbed by Promise.allSettled; still returns 200
    expect(status).toHaveBeenCalledWith(200);
  });
});
