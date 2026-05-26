import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/facts/verified-detail";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/factVerificationService", () => ({
  fetchVerifiedFactDetail: jest.fn(),
}));

import { fetchVerifiedFactDetail } from "@/lib/factVerificationService";

const mockFetchDetail = fetchVerifiedFactDetail as jest.Mock;

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

const SAMPLE_DETAIL = {
  matchedFact: "Water boils at 100 degrees Celsius.",
  source: "Scientific Consensus",
  category: "Chemistry",
  notes: "Measured at sea level.",
};

describe("GET /api/facts/verified-detail", () => {
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

  it("returns 400 when text query param is missing", async () => {
    const req = createMockRequest("GET");
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "text query parameter is required" });
  });

  it("returns 400 when text is an empty string", async () => {
    const req = createMockRequest("GET", { text: "   " });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "text query parameter is required" });
  });

  it("returns 404 when the fact is not found", async () => {
    mockFetchDetail.mockResolvedValueOnce(null);
    const req = createMockRequest("GET", { text: "unknown fact text" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Verified fact not found" });
  });

  it("returns 200 with fact detail when found", async () => {
    mockFetchDetail.mockResolvedValueOnce(SAMPLE_DETAIL);
    const req = createMockRequest("GET", { text: "Water boils at 100 degrees Celsius." });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(SAMPLE_DETAIL);
  });

  it("includes matchedFact, source, category, and notes in the response", async () => {
    mockFetchDetail.mockResolvedValueOnce(SAMPLE_DETAIL);
    const req = createMockRequest("GET", { text: "water boils at 100" });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0];
    expect(response).toMatchObject({
      matchedFact: expect.any(String),
      source: expect.any(String),
      category: expect.any(String),
    });
  });

  it("returns 500 when service throws", async () => {
    mockFetchDetail.mockRejectedValueOnce(new Error("DB error"));
    const req = createMockRequest("GET", { text: "some fact" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to fetch fact detail" });
  });
});
