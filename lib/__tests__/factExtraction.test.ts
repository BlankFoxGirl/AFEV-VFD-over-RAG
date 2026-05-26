import { extractFacts, extractClaimsFromText } from "@/lib/factExtraction";
import * as openaiClient from "@/lib/openaiClient";

jest.mock("@/lib/openaiClient");

const mockFetchChatCompletion = openaiClient.fetchChatCompletion as jest.MockedFunction<
  typeof openaiClient.fetchChatCompletion
>;

const DOCUMENT_ID = "doc-001";

describe("extractFacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty array for empty content", async () => {
    const result = await extractFacts("", DOCUMENT_ID);
    expect(result).toEqual([]);
    expect(mockFetchChatCompletion).not.toHaveBeenCalled();
  });

  it("returns an empty array for whitespace-only content", async () => {
    const result = await extractFacts("   \n  ", DOCUMENT_ID);
    expect(result).toEqual([]);
    expect(mockFetchChatCompletion).not.toHaveBeenCalled();
  });

  it("returns an empty array when the LLM returns an empty response", async () => {
    mockFetchChatCompletion.mockResolvedValue("");
    const result = await extractFacts("Some document content.", DOCUMENT_ID);
    expect(result).toEqual([]);
  });

  it("returns an empty array when the LLM returns only blank lines", async () => {
    mockFetchChatCompletion.mockResolvedValue("\n\n\n");
    const result = await extractFacts("Some document content.", DOCUMENT_ID);
    expect(result).toEqual([]);
  });

  it("parses a single claim from the LLM response", async () => {
    mockFetchChatCompletion.mockResolvedValue("The company was founded in 1994.");
    const result = await extractFacts("Some document.", DOCUMENT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("The company was founded in 1994.");
  });

  it("parses multiple claims from a multi-line LLM response", async () => {
    mockFetchChatCompletion.mockResolvedValue(
      "The company was founded in 1994.\nIt employs 10,000 people.\nHeadquarters are in Berlin.",
    );
    const result = await extractFacts("Some document.", DOCUMENT_ID);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("The company was founded in 1994.");
    expect(result[1].text).toBe("It employs 10,000 people.");
    expect(result[2].text).toBe("Headquarters are in Berlin.");
  });

  it("trims whitespace from each parsed claim", async () => {
    mockFetchChatCompletion.mockResolvedValue("  The river is 300 miles long.  ");
    const result = await extractFacts("Some document.", DOCUMENT_ID);
    expect(result[0].text).toBe("The river is 300 miles long.");
  });

  it("assigns documentId to each extracted claim", async () => {
    mockFetchChatCompletion.mockResolvedValue("Claim one.\nClaim two.");
    const result = await extractFacts("Some document.", DOCUMENT_ID);
    result.forEach((fact) => expect(fact.documentId).toBe(DOCUMENT_ID));
  });

  it("sets context to the document content", async () => {
    mockFetchChatCompletion.mockResolvedValue("A claim.");
    const content = "The document body.";
    const result = await extractFacts(content, DOCUMENT_ID);
    expect(result[0].context).toBe(content);
  });

  it("truncates context when document content exceeds the maximum length", async () => {
    mockFetchChatCompletion.mockResolvedValue("A claim.");
    const longContent = "x".repeat(3000);
    const result = await extractFacts(longContent, DOCUMENT_ID);
    expect(result[0].context.length).toBeLessThan(longContent.length);
    expect(result[0].context.endsWith("...")).toBe(true);
  });

  it("returns facts with text, context, and documentId fields", async () => {
    mockFetchChatCompletion.mockResolvedValue("The bridge was built in 1920.");
    const result = await extractFacts("Some document.", DOCUMENT_ID);
    expect(result[0]).toHaveProperty("text");
    expect(result[0]).toHaveProperty("context");
    expect(result[0]).toHaveProperty("documentId");
  });
});

describe("extractClaimsFromText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an array of claim strings", async () => {
    mockFetchChatCompletion.mockResolvedValue("Claim one.\nClaim two.");
    const result = await extractClaimsFromText("Some text.");
    expect(result).toEqual(["Claim one.", "Claim two."]);
  });

  it("returns an empty array when there are no claims", async () => {
    mockFetchChatCompletion.mockResolvedValue("");
    const result = await extractClaimsFromText("Some text.");
    expect(result).toEqual([]);
  });
});
