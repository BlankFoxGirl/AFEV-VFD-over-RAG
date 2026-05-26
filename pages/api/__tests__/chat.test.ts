import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/chat";

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/VerifiedFact", () => ({
  find: jest.fn(),
}));

import VerifiedFact from "@/lib/models/VerifiedFact";

const mockFind = VerifiedFact.find as jest.Mock;

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

function setupVerifiedFacts(factTexts: string[]) {
  mockFind.mockReturnValue({
    lean: jest.fn().mockResolvedValue(factTexts.map((text) => ({ text }))),
  });
}

describe("POST /api/chat", () => {
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

  it("returns 400 when message is missing", async () => {
    setupVerifiedFacts([]);
    const req = createMockRequest("POST", {});
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "message must be a non-empty string" });
  });

  it("returns 400 when message is not a string", async () => {
    setupVerifiedFacts([]);
    const req = createMockRequest("POST", { message: 42 });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "message must be a non-empty string" });
  });

  it("returns 400 for empty body", async () => {
    const req = createMockRequest("POST", null);
    const { res, status } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("returns 200 with reply and verificationStatus for valid message", async () => {
    setupVerifiedFacts([]);
    const req = createMockRequest("POST", { message: "What is water?" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { reply: string; verificationStatus: string };
    expect(response).toHaveProperty("reply");
    expect(response).toHaveProperty("verificationStatus");
  });

  it("flags reply as verified when message matches a verified fact", async () => {
    setupVerifiedFacts(["water boils at 100 degrees celsius"]);
    const req = createMockRequest("POST", { message: "water boils at 100 degrees celsius" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { reply: string; verificationStatus: string };
    expect(response.verificationStatus).toBe("verified");
    expect(response.reply).toContain("[Verified]");
  });

  it("flags reply as unverified when message does not match any verified fact", async () => {
    setupVerifiedFacts(["the eiffel tower is in paris"]);
    const req = createMockRequest("POST", { message: "xyz abc def" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { reply: string; verificationStatus: string };
    expect(response.verificationStatus).toBe("unverified");
    expect(response.reply).toContain("[Unverified]");
  });

  it("includes the user message in the chatbot reply", async () => {
    setupVerifiedFacts([]);
    const req = createMockRequest("POST", { message: "Is the sun a star?" });
    const { res, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const response = json.mock.calls[0][0] as { reply: string };
    expect(response.reply).toContain("Is the sun a star?");
  });

  it("returns 500 when database throws an error", async () => {
    mockFind.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB connection failed")),
    });
    const req = createMockRequest("POST", { message: "some message" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Failed to process message" });
  });

  it("simulates full chatbot session with verification flag influence", async () => {
    setupVerifiedFacts([
      "the moon orbits the earth",
      "water boils at 100 degrees celsius",
    ]);
    const req = createMockRequest("POST", { message: "the moon orbits the earth" });
    const { res, status, json } = createMockResponse();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(status).toHaveBeenCalledWith(200);
    const response = json.mock.calls[0][0] as { reply: string; verificationStatus: string };
    expect(response.verificationStatus).toBe("verified");
    expect(response.reply).toContain("[Verified]");
    expect(response.reply).toContain("the moon orbits the earth");
  });
});
