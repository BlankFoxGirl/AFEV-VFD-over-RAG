import { render, screen, waitFor, act } from "@testing-library/react";
import { FactsProvider, useFacts } from "@/lib/contexts/FactsContext";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const SAMPLE_FACTS: FactWithAnnotations[] = [
  {
    id: "fact-1",
    text: "The bridge was built in 1920.",
    context: "Context sentence one.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [],
  },
  {
    id: "fact-2",
    text: "The river spans 200 miles.",
    context: "Context sentence two.",
    documentId: "doc-1",
    documentName: "History Doc",
    annotations: [
      { text: "Note", editedFactText: null, createdAt: "2026-01-01T00:00:00Z" },
    ],
  },
];

function TestConsumer({ onRender }: { onRender: (facts: FactWithAnnotations[], loading: boolean, error: string | null) => void }) {
  const { state } = useFacts();
  onRender(state.facts, state.loading, state.error);
  return (
    <div>
      <span data-testid="loading">{String(state.loading)}</span>
      <span data-testid="error">{state.error ?? ""}</span>
      <span data-testid="count">{state.facts.length}</span>
    </div>
  );
}

function LoadTrigger() {
  const { loadFacts } = useFacts();
  return (
    <button onClick={() => void loadFacts()} aria-label="Load facts">
      Load
    </button>
  );
}

function UpdateTrigger({ fact }: { fact: FactWithAnnotations }) {
  const { updateFact } = useFacts();
  return (
    <button onClick={() => updateFact(fact)} aria-label="Update fact">
      Update
    </button>
  );
}

describe("FactsContext", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("throws when useFacts is used outside FactsProvider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    function BadComponent() {
      useFacts();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useFacts must be used within a FactsProvider",
    );
    consoleError.mockRestore();
  });

  it("starts with empty facts and no loading/error", () => {
    const onRender = jest.fn();
    render(
      <FactsProvider>
        <TestConsumer onRender={onRender} />
      </FactsProvider>,
    );
    const lastCall = onRender.mock.calls[
      onRender.mock.calls.length - 1
    ] as [FactWithAnnotations[], boolean, string | null];
    expect(lastCall[0]).toEqual([]);
    expect(lastCall[1]).toBe(false);
    expect(lastCall[2]).toBeNull();
  });

  it("sets loading true while fetching facts", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((r) => {
        resolvePromise = r;
      }),
    );

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <LoadTrigger />
      </FactsProvider>,
    );

    const button = screen.getByRole("button", { name: /load facts/i });
    act(() => {
      button.click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("true"),
    );

    resolvePromise!({ ok: true, json: async () => ({ facts: [] }) });
  });

  it("populates facts after successful load", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <LoadTrigger />
      </FactsProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /load facts/i }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("2"),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("sets error state when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <LoadTrigger />
      </FactsProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /load facts/i }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("error")).not.toHaveTextContent(""),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("sets error state when API returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <LoadTrigger />
      </FactsProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /load facts/i }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("error")).not.toHaveTextContent(""),
    );
  });

  it("updates a specific fact in state via updateFact", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: SAMPLE_FACTS }),
    });

    const updatedFact: FactWithAnnotations = {
      ...SAMPLE_FACTS[0],
      text: "Updated text.",
      annotations: [
        { text: "New note", editedFactText: null, createdAt: "2026-05-25T00:00:00Z" },
      ],
    };

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <LoadTrigger />
        <UpdateTrigger fact={updatedFact} />
      </FactsProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /load facts/i }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("2"),
    );

    act(() => {
      screen.getByRole("button", { name: /update fact/i }).click();
    });

    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("passes documentId filter in fetch URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facts: [] }),
    });

    function FilteredLoadTrigger() {
      const { loadFacts } = useFacts();
      return (
        <button
          onClick={() => void loadFacts("doc-abc")}
          aria-label="Load filtered"
        >
          Load Filtered
        </button>
      );
    }

    render(
      <FactsProvider>
        <TestConsumer onRender={jest.fn()} />
        <FilteredLoadTrigger />
      </FactsProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /load filtered/i }).click();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("documentId=doc-abc");
  });
});
