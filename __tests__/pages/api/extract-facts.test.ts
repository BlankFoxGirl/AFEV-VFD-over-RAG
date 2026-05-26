import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/extract-facts";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  insertMany: jest.fn(),
}));

import Fact from "@/lib/models/Fact";

const mockInsertMany = Fact.insertMany as jest.Mock;

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

describe("POST /api/extract-facts", () => {
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

  it("returns 400 when documentId is missing", async () => {
    const req = createMockRequest("POST", { content: "Some text." });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("returns 400 when content is missing", async () => {
    const req = createMockRequest("POST", { documentId: "doc-1" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for empty body", async () => {
    const req = createMockRequest("POST", null);
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 200 with structured facts for valid request", async () => {
    const fakeId = { toString: () => "abc123" };
    mockInsertMany.mockResolvedValueOnce([
      {
        _id: fakeId,
        text: "The bridge was built in 1920.",
        context: "The bridge was built in 1920.",
        documentId: "doc-1",
        documentName: "Test Doc",
      },
    ]);

    const req = createMockRequest("POST", {
      documentId: "doc-1",
      content: "The bridge was built in 1920.",
      documentName: "Test Doc",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      facts: [
        {
          id: "abc123",
          text: "The bridge was built in 1920.",
          context: "The bridge was built in 1920.",
          documentId: "doc-1",
          documentName: "Test Doc",
        },
      ],
    });
  });

  it("uses 'Untitled Document' when documentName is omitted", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    const req = createMockRequest("POST", {
      documentId: "doc-2",
      content: "Hello world is a simple phrase.",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ documentName: "Untitled Document" }),
      ]),
    );
  });

  it("returns 500 when database throws an error", async () => {
    mockInsertMany.mockRejectedValueOnce(new Error("DB error"));
    const req = createMockRequest("POST", {
      documentId: "doc-3",
      content: "The company was founded in 1990.",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to extract facts" });
  });

  it("returns facts array with expected shape", async () => {
    const fakeId = { toString: () => "fact-id-1" };
    mockInsertMany.mockResolvedValueOnce([
      {
        _id: fakeId,
        text: "Water has a boiling point of 100 degrees.",
        context: "Water has a boiling point of 100 degrees.",
        documentId: "doc-4",
        documentName: "Science Doc",
      },
    ]);
    const req = createMockRequest("POST", {
      documentId: "doc-4",
      content: "Water has a boiling point of 100 degrees.",
      documentName: "Science Doc",
    });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0] as { facts: unknown[] };
    expect(response.facts[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      context: expect.any(String),
      documentId: expect.any(String),
      documentName: expect.any(String),
    });
  });
});
