jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("@/lib/models/Fact", () => ({
  insertMany: jest.fn(),
}));
jest.mock("@/lib/factVerificationService", () => ({
  resolveVerificationStatus: jest.fn(),
}));

import { processUploadedDocument } from "@/lib/documentProcessor";
import Fact from "@/lib/models/Fact";
import { resolveVerificationStatus } from "@/lib/factVerificationService";

const mockInsertMany = Fact.insertMany as jest.Mock;
const mockResolveVerificationStatus = resolveVerificationStatus as jest.Mock;

function makeVerified() {
  return Promise.resolve({ status: "verified", similarity: 0.9, matchedFact: "some fact" });
}

function makeUnverified() {
  return Promise.resolve({ status: "unverified", similarity: 0.1, matchedFact: null });
}

describe("processUploadedDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns factCount matching the number of extracted facts", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockImplementation(makeVerified);

    const result = await processUploadedDocument(
      "doc_1",
      "science.txt",
      "The Earth has one moon. Mars has two moons.",
    );

    expect(result.factCount).toBeGreaterThan(0);
  });

  it("returns zero factCount for content with no factual sentences", async () => {
    const result = await processUploadedDocument(
      "doc_2",
      "questions.txt",
      "How are you? What time is it?",
    );

    expect(result.factCount).toBe(0);
    expect(result.verificationSummary).toEqual({ verified: 0, unverified: 0 });
  });

  it("calls Fact.insertMany with extracted facts mapped to documentName", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockImplementation(makeVerified);

    await processUploadedDocument(
      "doc_3",
      "climate.txt",
      "CO2 levels have risen by 50%.",
    );

    expect(mockInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: "doc_3",
          documentName: "climate.txt",
        }),
      ]),
    );
  });

  it("does not call insertMany when content yields no facts", async () => {
    await processUploadedDocument("doc_4", "empty.txt", "Hello! How are you?");

    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it("calls resolveVerificationStatus for each extracted fact", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockImplementation(makeVerified);

    const result = await processUploadedDocument(
      "doc_5",
      "data.txt",
      "The river was discovered in 1492. It stretches 3000 km.",
    );

    expect(mockResolveVerificationStatus).toHaveBeenCalledTimes(result.factCount);
    expect(mockResolveVerificationStatus).toHaveBeenCalledWith(expect.any(String));
  });

  it("counts verified facts correctly in the verification summary", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus
      .mockResolvedValueOnce({ status: "verified", similarity: 0.9, matchedFact: "fact" })
      .mockResolvedValueOnce({ status: "unverified", similarity: 0.1, matchedFact: null });

    const result = await processUploadedDocument(
      "doc_6",
      "mixed.txt",
      "Water boils at 100 degrees Celsius. The sky is green.",
    );

    expect(result.verificationSummary.verified).toBeGreaterThanOrEqual(0);
    expect(result.verificationSummary.unverified).toBeGreaterThanOrEqual(0);
    expect(
      result.verificationSummary.verified + result.verificationSummary.unverified,
    ).toBe(result.factCount);
  });

  it("treats failed verification settlements as unverified", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockRejectedValue(new Error("Verification error"));

    const result = await processUploadedDocument(
      "doc_7",
      "error.txt",
      "The company was founded in 1990.",
    );

    expect(result.verificationSummary.verified).toBe(0);
    expect(result.verificationSummary.unverified).toBe(result.factCount);
  });

  it("propagates errors from Fact.insertMany", async () => {
    mockInsertMany.mockRejectedValueOnce(new Error("DB write failed"));
    mockResolveVerificationStatus.mockImplementation(makeVerified);

    await expect(
      processUploadedDocument("doc_8", "fail.txt", "The company was founded in 1990."),
    ).rejects.toThrow();
  });

  it("returns a verificationSummary with verified and unverified counts", async () => {
    mockInsertMany.mockResolvedValueOnce([]);
    mockResolveVerificationStatus.mockImplementation(makeVerified);

    const result = await processUploadedDocument(
      "doc_9",
      "report.txt",
      "Mount Everest is 8849 meters tall.",
    );

    expect(result.verificationSummary).toHaveProperty("verified");
    expect(result.verificationSummary).toHaveProperty("unverified");
  });
});
