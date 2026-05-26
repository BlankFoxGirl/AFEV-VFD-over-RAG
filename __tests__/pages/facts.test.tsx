import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FactsPage from "@/pages/facts";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";

jest.mock("next/head", () => {
  const MockHead = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  MockHead.displayName = "MockHead";
  return MockHead;
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

const SAMPLE_FACTS: FactWithAnnotations[] = [
  {
    id: "fact-1",
    text: "The bridge was built in 1920.",
    context: "The old bridge was built in 1920 by the city council.",
    documentId: "doc-001",
    documentName: "History Document",
    annotations: [],
  },
  {
    id: "fact-2",
    text: "The river spans 200 miles.",
    context: "The great river spans 200 miles across three states.",
    documentId: "doc-001",
    documentName: "History Document",
    annotations: [
      {
        text: "Verify mileage",
        editedFactText: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
];

const UPDATED_FACT: FactWithAnnotations = {
  ...SAMPLE_FACTS[0],
  annotations: [
    {
      text: "New annotation",
      editedFactText: null,
      createdAt: "2026-05-25T10:00:00.000Z",
    },
  ],
};

describe("FactsPage", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders the page heading", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: [] }),
    });
    render(<FactsPage />);
    expect(screen.getByRole("heading", { name: /^facts$/i })).toBeInTheDocument();
  });

  it("shows loading state while fetching facts", async () => {
    let resolve: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );

    render(<FactsPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading facts/i)).toBeInTheDocument();

    resolve!({ ok: true, json: async () => ({ facts: [] }) });
  });

  it("renders extracted facts list after loading", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    render(<FactsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: /facts list/i }),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getByText("The bridge was built in 1920."),
    ).toBeInTheDocument();
    expect(screen.getByText("The river spans 200 miles.")).toBeInTheDocument();
  });

  it("shows empty state when no facts are returned", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: [] }),
    });

    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText(/no facts found/i)).toBeInTheDocument(),
    );
  });

  it("shows error state when loading fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
  });

  it("shows placeholder when no fact is selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    expect(screen.getByText(/select a fact from the list/i)).toBeInTheDocument();
  });

  it("shows annotation panel when a fact is selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    const user = userEvent.setup();
    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", {
        name: /select fact: the bridge was built in 1920/i,
      }),
    );

    expect(
      screen.getByRole("textbox", { name: /edit fact text/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /annotation text/i }),
    ).toBeInTheDocument();
  });

  it("displays annotation count for each fact in the list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    expect(screen.getByText("0 annotations")).toBeInTheDocument();
    expect(screen.getByText("1 annotation")).toBeInTheDocument();
  });

  it("updates the annotation panel in real-time after saving annotation", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ facts: SAMPLE_FACTS }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => UPDATED_FACT,
      });

    const user = userEvent.setup();
    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", {
        name: /select fact: the bridge was built in 1920/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", { name: /annotation text/i }),
      "New annotation",
    );

    await user.click(
      screen.getByRole("button", { name: /save annotation/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("New annotation")).toBeInTheDocument(),
    );
  });

  it("allows selecting multiple facts sequentially without page reload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    const user = userEvent.setup();
    render(<FactsPage />);

    await waitFor(() =>
      expect(screen.getByText("The bridge was built in 1920.")).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", {
        name: /select fact: the bridge was built in 1920/i,
      }),
    );

    expect(
      screen.getByRole("textbox", { name: /edit fact text/i }),
    ).toHaveValue("The bridge was built in 1920.");

    await user.click(
      screen.getByRole("button", {
        name: /select fact: the river spans 200 miles/i,
      }),
    );

    expect(
      screen.getByRole("textbox", { name: /edit fact text/i }),
    ).toHaveValue("The river spans 200 miles.");

    expect(screen.getByText("Verify mileage")).toBeInTheDocument();
  });
});
