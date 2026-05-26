import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/facts/[id]/annotate";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  findByIdAndUpdate: jest.fn(),
}));

import Fact from "@/lib/models/Fact";

const mockFindByIdAndUpdate = Fact.findByIdAndUpdate as jest.Mock;

function createMockRequest(
  method: string,
  body: unknown,
  query: Record<string, string> = { id: "fact-123" },
): Partial<NextApiRequest> {
  return { method, body, query };
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

const UPDATED_DB_FACT = {
  _id: { toString: () => "fact-123" },
  text: "The bridge was built in 1920.",
  context: "The old bridge was built in 1920.",
  documentId: "doc-1",
  documentName: "History Doc",
  annotations: [
    {
      text: "Cross-check with city records",
      editedFactText: null,
      createdAt: new Date("2026-05-25T10:00:00Z"),
    },
  ],
};

describe("POST /api/facts/[id]/annotate", () => {
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

  it("returns 400 when annotationText is missing", async () => {
    const req = createMockRequest("POST", { editedFactText: "some text" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "annotationText is required" });
  });

  it("returns 400 when annotationText is empty string", async () => {
    const req = createMockRequest("POST", { annotationText: "   " });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for empty body", async () => {
    const req = createMockRequest("POST", null);
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 200 with updated fact on success", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(UPDATED_DB_FACT),
    });

    const req = createMockRequest("POST", {
      annotationText: "Cross-check with city records",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as {
      id: string;
      annotations: unknown[];
    };
    expect(response.id).toBe("fact-123");
    expect(response.annotations).toHaveLength(1);
  });

  it("includes editedFactText in update when provided and non-empty", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        ...UPDATED_DB_FACT,
        text: "Updated text.",
        annotations: [
          {
            text: "Edited fact",
            editedFactText: "Updated text.",
            createdAt: new Date(),
          },
        ],
      }),
    });

    const req = createMockRequest("POST", {
      annotationText: "Edited fact",
      editedFactText: "Updated text.",
    });
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "fact-123",
      expect.objectContaining({
        $set: { text: "Updated text." },
        $push: expect.any(Object),
      }),
      { new: true },
    );
  });

  it("does not set text field when editedFactText is empty", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(UPDATED_DB_FACT),
    });

    const req = createMockRequest("POST", {
      annotationText: "Just a note",
      editedFactText: "",
    });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "fact-123",
      expect.not.objectContaining({ $set: expect.anything() }),
      { new: true },
    );
  });

  it("returns 404 when fact is not found", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(null),
    });

    const req = createMockRequest("POST", {
      annotationText: "Some annotation",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Fact not found" });
  });

  it("returns 500 when database throws an unexpected error", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockRejectedValueOnce(new Error("DB failure")),
    });

    const req = createMockRequest("POST", {
      annotationText: "Some annotation",
    });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to save annotation" });
  });

  it("returns annotation with ISO string createdAt", async () => {
    mockFindByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(UPDATED_DB_FACT),
    });

    const req = createMockRequest("POST", {
      annotationText: "Cross-check with city records",
    });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    const response = json.mock.calls[0][0] as {
      annotations: Array<{ createdAt: string }>;
    };
    expect(response.annotations[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
