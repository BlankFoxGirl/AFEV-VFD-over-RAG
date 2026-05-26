import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/facts/index";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  find: jest.fn(),
}));

import Fact from "@/lib/models/Fact";

const mockFind = Fact.find as jest.Mock;

function createMockRequest(
  method: string,
  query: Record<string, string> = {},
): Partial<NextApiRequest> {
  return { method, query };
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

const SAMPLE_DB_FACTS = [
  {
    _id: { toString: () => "fact-id-1" },
    text: "The bridge was built in 1920.",
    context: "The old bridge was built in 1920.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [
      {
        text: "Verify this",
        editedFactText: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ],
  },
  {
    _id: { toString: () => "fact-id-2" },
    text: "The river spans 200 miles.",
    context: "The river spans 200 miles across three states.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [],
  },
];

describe("GET /api/facts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 405 for non-GET methods", async () => {
    const req = createMockRequest("POST");
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("returns 200 with list of facts", async () => {
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValueOnce(SAMPLE_DB_FACTS),
    });

    const req = createMockRequest("GET");
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { facts: unknown[] };
    expect(response.facts).toHaveLength(2);
  });

  it("returns facts with expected shape including annotations", async () => {
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValueOnce([SAMPLE_DB_FACTS[0]]),
    });

    const req = createMockRequest("GET");
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    const response = json.mock.calls[0][0] as {
      facts: Array<{
        id: string;
        text: string;
        annotations: Array<{ text: string; editedFactText: string | null; createdAt: string }>;
      }>;
    };
    expect(response.facts[0]).toMatchObject({
      id: "fact-id-1",
      text: "The bridge was built in 1920.",
      annotations: [
        {
          text: "Verify this",
          editedFactText: null,
          createdAt: expect.any(String),
        },
      ],
    });
  });

  it("filters by documentId when provided in query", async () => {
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValueOnce([]),
    });

    const req = createMockRequest("GET", { documentId: "doc-xyz" });
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockFind).toHaveBeenCalledWith({ documentId: "doc-xyz" });
  });

  it("fetches all facts when no documentId is provided", async () => {
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValueOnce([]),
    });

    const req = createMockRequest("GET");
    const { res } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockFind).toHaveBeenCalledWith({});
  });

  it("returns 500 when database throws", async () => {
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValueOnce(new Error("DB error")),
    });

    const req = createMockRequest("GET");
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to fetch facts" });
  });
});
