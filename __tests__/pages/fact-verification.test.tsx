import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import FactVerificationPage from "@/pages/fact-verification";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";

jest.mock("next/head", () => {
  const MockHead = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  MockHead.displayName = "MockHead";
  return MockHead;
});

jest.mock("@/lib/apiClient", () => ({
  fetchFacts: jest.fn(),
  verifyFact: jest.fn(),
}));

import { fetchFacts, verifyFact } from "@/lib/apiClient";

const mockFetchFacts = fetchFacts as jest.Mock;
const mockVerifyFact = verifyFact as jest.Mock;

const SAMPLE_FACTS: FactWithAnnotations[] = [
  {
    id: "fact-1",
    text: "The bridge was built in 1920.",
    context: "Historical context for the bridge.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [],
  },
  {
    id: "fact-2",
    text: "The river spans 200 miles.",
    context: "Geographic context for the river.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [],
  },
];

describe("FactVerificationPage", () => {
  beforeEach(() => {
    mockFetchFacts.mockClear();
    mockVerifyFact.mockClear();
  });

  it("renders without error", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    await act(async () => { render(<FactVerificationPage />); });
    expect(document.body).toBeTruthy();
  });

  it("renders the page heading", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    await act(async () => { render(<FactVerificationPage />); });
    expect(
      screen.getByRole("heading", { name: /fact verification/i }),
    ).toBeInTheDocument();
  });

  it("renders the page description", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    await act(async () => { render(<FactVerificationPage />); });
    expect(
      screen.getByText(/review extracted facts and verify their accuracy/i),
    ).toBeInTheDocument();
  });

  it("shows loading indicator while fetching facts", async () => {
    mockFetchFacts.mockReturnValueOnce(new Promise(() => {}));
    render(<FactVerificationPage />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading facts/i);
  });

  it("renders the facts grid container", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByLabelText(/facts list placeholder/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByLabelText(/facts list placeholder/i).parentElement,
    ).toBeInTheDocument();
  });

  it("renders the facts list placeholder when no facts are returned", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByLabelText(/facts list placeholder/i)).toBeInTheDocument(),
    );
  });

  it("renders placeholder text directing the user to extract facts first", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText(/verified facts will appear here/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/extract and annotate facts first/i),
    ).toBeInTheDocument();
  });

  it("renders fact cards after successful API response", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );
    expect(screen.getByText("The river spans 200 miles.")).toBeInTheDocument();
  });

  it("renders each fact's context text", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(
        screen.getByText("Historical context for the bridge."),
      ).toBeInTheDocument(),
    );
  });

  it("renders each fact's document name", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getAllByText("History Doc")).toHaveLength(SAMPLE_FACTS.length),
    );
  });

  it("renders an error message when the API call fails", async () => {
    mockFetchFacts.mockRejectedValueOnce(new Error("Network error"));
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Network error"),
    );
  });

  it("does not show placeholder when facts are loaded", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );
    expect(
      screen.queryByLabelText(/facts list placeholder/i),
    ).not.toBeInTheDocument();
  });

  it("calls fetchFacts once on mount", async () => {
    mockFetchFacts.mockResolvedValueOnce([]);
    render(<FactVerificationPage />);
    await waitFor(() => expect(mockFetchFacts).toHaveBeenCalledTimes(1));
    expect(mockFetchFacts).toHaveBeenCalledWith();
  });

  it("renders a Verify button for each fact card", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );
    const verifyButtons = screen.getAllByRole("button", { name: /verify fact/i });
    expect(verifyButtons).toHaveLength(SAMPLE_FACTS.length);
  });

  it("shows 'Verifying…' label and disables button while checking", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockReturnValueOnce(new Promise(() => {}));

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const [firstButton] = screen.getAllByRole("button", { name: /verify fact/i });
    fireEvent.click(firstButton);

    await waitFor(() =>
      expect(screen.getByText("Verifying…")).toBeInTheDocument(),
    );
    expect(firstButton).toBeDisabled();
  });

  it("shows 'verified' badge after successful verification with verified status", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockResolvedValueOnce({ status: "verified", similarity: 1, matchedFact: "The bridge was built in 1920." });

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const [firstButton] = screen.getAllByRole("button", { name: /verify fact/i });
    await act(async () => { fireEvent.click(firstButton); });

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /fact verification status: verified/i })).toBeInTheDocument(),
    );
  });

  it("shows 'unverified' badge after verification returns unverified status", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockResolvedValueOnce({ status: "unverified", similarity: 0, matchedFact: null });

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const [firstButton] = screen.getAllByRole("button", { name: /verify fact/i });
    await act(async () => { fireEvent.click(firstButton); });

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /fact verification status: unverified/i })).toBeInTheDocument(),
    );
  });

  it("shows a per-fact error message when verification fails", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockRejectedValueOnce(new Error("Network failure"));

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const [firstButton] = screen.getAllByRole("button", { name: /verify fact/i });
    await act(async () => { fireEvent.click(firstButton); });

    await waitFor(() =>
      expect(screen.getByText("Network failure")).toBeInTheDocument(),
    );
  });

  it("re-enables Verify button after verification completes", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockResolvedValueOnce({ status: "verified", similarity: 1, matchedFact: "The bridge was built in 1920." });

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const [firstButton] = screen.getAllByRole("button", { name: /verify fact/i });
    await act(async () => { fireEvent.click(firstButton); });

    await waitFor(() => expect(firstButton).not.toBeDisabled());
  });

  it("only updates the status of the clicked fact, not others", async () => {
    mockFetchFacts.mockResolvedValueOnce(SAMPLE_FACTS);
    mockVerifyFact.mockResolvedValueOnce({ status: "verified", similarity: 1, matchedFact: SAMPLE_FACTS[0].text });

    render(<FactVerificationPage />);
    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    const buttons = screen.getAllByRole("button", { name: /verify fact/i });
    await act(async () => { fireEvent.click(buttons[0]); });

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /fact verification status: verified/i })).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole("img", { name: /fact verification status: unverified/i }),
    ).not.toBeInTheDocument();
  });
});
