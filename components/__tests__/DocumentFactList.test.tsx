import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentFactList from "@/components/DocumentFactList";
import type { Fact } from "@/components/DocumentFactList";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE_PROPS = {
  documentId: "doc-001",
  documentName: "Test Document",
  content: "The company was founded in 1994 and has 500 employees.",
};

const SAMPLE_FACTS: Fact[] = [
  {
    id: "fact-1",
    text: "The company was founded in 1994.",
    context: "The company was founded in 1994 and has 500 employees.",
    documentId: "doc-001",
    documentName: "Test Document",
  },
  {
    id: "fact-2",
    text: "The company has 500 employees.",
    context: "The company was founded in 1994 and has 500 employees.",
    documentId: "doc-001",
    documentName: "Test Document",
  },
];

describe("DocumentFactList", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("idle state", () => {
    it("renders the 'Extracted Facts' heading", () => {
      render(<DocumentFactList {...BASE_PROPS} />);
      expect(
        screen.getByRole("heading", { name: /extracted facts/i }),
      ).toBeInTheDocument();
    });

    it("renders the Extract Facts button", () => {
      render(<DocumentFactList {...BASE_PROPS} />);
      expect(
        screen.getByRole("button", { name: /extract facts from document/i }),
      ).toBeInTheDocument();
    });

    it("shows the idle empty-state message", () => {
      render(<DocumentFactList {...BASE_PROPS} />);
      expect(
        screen.getByText(/no facts extracted yet/i),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("disables the button while loading", async () => {
      let resolve: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      const button = screen.getByRole("button", { name: /extract facts from document/i });
      expect(button).toBeDisabled();

      resolve!({ ok: true, json: async () => ({ facts: [] }) });
    });

    it("shows the loading status message", async () => {
      let resolve: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/extracting facts/i)).toBeInTheDocument();

      resolve!({ ok: true, json: async () => ({ facts: [] }) });
    });
  });

  describe("success state", () => {
    it("renders the list of extracted facts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ facts: SAMPLE_FACTS }),
      });

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      await waitFor(() =>
        expect(
          screen.getByRole("list", { name: /extracted facts/i }),
        ).toBeInTheDocument(),
      );

      expect(
        screen.getByText("The company was founded in 1994."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The company has 500 employees."),
      ).toBeInTheDocument();
    });

    it("shows empty message when no facts are returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ facts: [] }),
      });

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      await waitFor(() =>
        expect(
          screen.getByText(/no facts found in this document/i),
        ).toBeInTheDocument(),
      );
    });

    it("displays each fact's context text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ facts: SAMPLE_FACTS }),
      });

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      await waitFor(() =>
        expect(
          screen.getAllByText(
            "The company was founded in 1994 and has 500 employees.",
          ).length,
        ).toBeGreaterThan(0),
      );
    });
  });

  describe("error state", () => {
    it("shows an alert with the error message when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("shows the error returned by the API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Document not found" }),
      });

      const user = userEvent.setup();
      render(<DocumentFactList {...BASE_PROPS} />);
      await user.click(
        screen.getByRole("button", { name: /extract facts from document/i }),
      );

      await waitFor(() =>
        expect(screen.getByText("Document not found")).toBeInTheDocument(),
      );
    });
  });
});
