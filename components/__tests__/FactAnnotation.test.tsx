import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FactAnnotation from "@/components/FactAnnotation";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE_FACT: FactWithAnnotations = {
  id: "fact-001",
  text: "The bridge was built in 1920.",
  context: "The old bridge was built in 1920 by the city council.",
  documentId: "doc-001",
  documentName: "History Document",
  annotations: [],
};

const FACT_WITH_ANNOTATIONS: FactWithAnnotations = {
  ...BASE_FACT,
  annotations: [
    {
      text: "Verify construction year",
      editedFactText: null,
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      text: "Cross-reference with city records",
      editedFactText: "The bridge was built around 1920.",
      createdAt: "2026-01-02T12:00:00.000Z",
    },
  ],
};

const UPDATED_FACT: FactWithAnnotations = {
  ...BASE_FACT,
  annotations: [
    {
      text: "New annotation note",
      editedFactText: null,
      createdAt: "2026-05-25T10:00:00.000Z",
    },
  ],
};

describe("FactAnnotation", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("rendering", () => {
    it("renders the fact annotation panel", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(
        screen.getByRole("region", { name: /fact annotation panel/i }),
      ).toBeInTheDocument();
    });

    it("renders the fact text in an editable textarea", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      const textarea = screen.getByRole("textbox", { name: /edit fact text/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(BASE_FACT.text);
    });

    it("renders the context text", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(screen.getByText(BASE_FACT.context)).toBeInTheDocument();
    });

    it("renders the annotation input textarea", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(
        screen.getByRole("textbox", { name: /annotation text/i }),
      ).toBeInTheDocument();
    });

    it("renders the save button", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(
        screen.getByRole("button", { name: /save annotation/i }),
      ).toBeInTheDocument();
    });

    it("disables save button when annotation input is empty", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(
        screen.getByRole("button", { name: /save annotation/i }),
      ).toBeDisabled();
    });

    it("shows 'No annotations yet' when fact has no annotations", () => {
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      expect(screen.getByText(/no annotations yet/i)).toBeInTheDocument();
    });

    it("renders existing annotations", () => {
      render(
        <FactAnnotation
          fact={FACT_WITH_ANNOTATIONS}
          onAnnotationSaved={jest.fn()}
        />,
      );
      expect(
        screen.getByText("Verify construction year"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Cross-reference with city records"),
      ).toBeInTheDocument();
    });

    it("renders annotation count in heading", () => {
      render(
        <FactAnnotation
          fact={FACT_WITH_ANNOTATIONS}
          onAnnotationSaved={jest.fn()}
        />,
      );
      expect(screen.getByText(/annotations \(2\)/i)).toBeInTheDocument();
    });

    it("renders edited fact text for annotations that have it", () => {
      render(
        <FactAnnotation
          fact={FACT_WITH_ANNOTATIONS}
          onAnnotationSaved={jest.fn()}
        />,
      );
      expect(
        screen.getByText(/Edited: The bridge was built around 1920./i),
      ).toBeInTheDocument();
    });
  });

  describe("editing fact text", () => {
    it("allows user to edit the fact text", async () => {
      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      const textarea = screen.getByRole("textbox", { name: /edit fact text/i });
      await user.clear(textarea);
      await user.type(textarea, "Updated fact text.");
      expect(textarea).toHaveValue("Updated fact text.");
    });
  });

  describe("adding annotation", () => {
    it("enables save button when annotation text is entered", async () => {
      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );
      await user.type(
        screen.getByRole("textbox", { name: /annotation text/i }),
        "Check this fact",
      );
      expect(
        screen.getByRole("button", { name: /save annotation/i }),
      ).not.toBeDisabled();
    });

    it("calls onAnnotationSaved with updated fact after successful save", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => UPDATED_FACT,
      });

      const onSaved = jest.fn();
      const user = userEvent.setup();
      render(<FactAnnotation fact={BASE_FACT} onAnnotationSaved={onSaved} />);

      await user.type(
        screen.getByRole("textbox", { name: /annotation text/i }),
        "New annotation note",
      );
      await user.click(
        screen.getByRole("button", { name: /save annotation/i }),
      );

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(UPDATED_FACT));
    });

    it("clears annotation input after successful save", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => UPDATED_FACT,
      });

      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );

      const input = screen.getByRole("textbox", { name: /annotation text/i });
      await user.type(input, "Some note");
      await user.click(
        screen.getByRole("button", { name: /save annotation/i }),
      );

      await waitFor(() => expect(input).toHaveValue(""));
    });

    it("shows saved status after successful save", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => UPDATED_FACT,
      });

      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );

      await user.type(
        screen.getByRole("textbox", { name: /annotation text/i }),
        "Some note",
      );
      await user.click(
        screen.getByRole("button", { name: /save annotation/i }),
      );

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent("Saved"),
      );
    });

    it("shows error status when save fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );

      await user.type(
        screen.getByRole("textbox", { name: /annotation text/i }),
        "Some note",
      );
      await user.click(
        screen.getByRole("button", { name: /save annotation/i }),
      );

      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });

    it("sends editedFactText when fact text was modified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => UPDATED_FACT,
      });

      const user = userEvent.setup();
      render(
        <FactAnnotation fact={BASE_FACT} onAnnotationSaved={jest.fn()} />,
      );

      const factTextarea = screen.getByRole("textbox", {
        name: /edit fact text/i,
      });
      await user.clear(factTextarea);
      await user.type(factTextarea, "Modified fact text.");

      await user.type(
        screen.getByRole("textbox", { name: /annotation text/i }),
        "Changed fact",
      );
      await user.click(
        screen.getByRole("button", { name: /save annotation/i }),
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const [, options] = mockFetch.mock.calls[0] as [
        string,
        { body: string },
      ];
      const body = JSON.parse(options.body) as {
        editedFactText?: string;
      };
      expect(body.editedFactText).toBe("Modified fact text.");
    });
  });
});
