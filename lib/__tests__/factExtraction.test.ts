import { extractFacts } from "@/lib/factExtraction";

const DOCUMENT_ID = "doc-001";

describe("extractFacts", () => {
  it("returns an empty array for empty content", () => {
    expect(extractFacts("", DOCUMENT_ID)).toEqual([]);
  });

  it("returns an empty array when no factual sentences are found", () => {
    const content = "Hello there. How are you doing? Nice to meet you.";
    expect(extractFacts(content, DOCUMENT_ID)).toEqual([]);
  });

  it("extracts sentences containing numbers as facts", () => {
    const content = "The population is 8 billion people. That is a lot.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0].text).toBe("The population is 8 billion people.");
  });

  it("assigns the documentId to each extracted fact", () => {
    const content = "The company was founded in 1994.";
    const facts = extractFacts(content, DOCUMENT_ID);
    facts.forEach((fact) => expect(fact.documentId).toBe(DOCUMENT_ID));
  });

  it("includes context with surrounding sentences", () => {
    const content =
      "Intro sentence. The river is 300 miles long. Concluding sentence.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts[0].context).toContain("Intro sentence");
    expect(facts[0].context).toContain("The river is 300 miles long.");
    expect(facts[0].context).toContain("Concluding sentence");
  });

  it("sets context to just the target sentence when it is the only sentence", () => {
    const content = "The library contains 2 million books.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts[0].context).toBe("The library contains 2 million books.");
  });

  it("extracts facts from sentences using 'is/are/was/were' patterns", () => {
    const content = "Water is composed of hydrogen and oxygen.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts.length).toBe(1);
    expect(facts[0].text).toBe(content);
  });

  it("extracts facts from sentences using 'founded/created' patterns", () => {
    const content = "The organization was established in Berlin.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts.length).toBe(1);
  });

  it("extracts multiple facts from multi-sentence content", () => {
    const content =
      "The university was founded in 1856. It currently has 30,000 students. Many enjoy the campus.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts.length).toBeGreaterThanOrEqual(2);
  });

  it("returns facts with text, context, and documentId fields", () => {
    const content = "The bridge was built in 1920.";
    const facts = extractFacts(content, DOCUMENT_ID);
    expect(facts[0]).toHaveProperty("text");
    expect(facts[0]).toHaveProperty("context");
    expect(facts[0]).toHaveProperty("documentId");
  });
});
