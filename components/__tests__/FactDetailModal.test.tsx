import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FactDetailModal from "@/components/FactDetailModal";
import type { FactDetailResponse } from "@/pages/api/facts/verified-detail";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function buildFactDetail(overrides: Partial<FactDetailResponse> = {}): FactDetailResponse {
  return {
    matchedFact: "Water boils at 100 degrees Celsius.",
    source: "Scientific Consensus",
    category: "Chemistry",
    notes: "Measured at sea level (1 atm pressure).",
    ...overrides,
  };
}

function mockSuccessResponse(detail: FactDetailResponse) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => detail,
  });
}

function mockErrorResponse(status: number, error: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error }),
    status,
  });
}

describe("FactDetailModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("accessibility", () => {
    it("renders a dialog with aria-modal", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has a labelled title visible to assistive technology", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      expect(screen.getByRole("dialog", { name: /verification detail/i })).toBeInTheDocument();
    });

    it("renders a close button with accessible label", () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      expect(
        screen.getByRole("button", { name: /close verification detail/i }),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows a loading indicator while fetching", () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("displays the matched fact text", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(
          screen.getByText("Water boils at 100 degrees Celsius."),
        ).toBeInTheDocument(),
      );
    });

    it("displays the source of verification", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText("Scientific Consensus")).toBeInTheDocument(),
      );
    });

    it("displays the category", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText("Chemistry")).toBeInTheDocument(),
      );
    });

    it("displays notes when present", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(
          screen.getByText("Measured at sea level (1 atm pressure)."),
        ).toBeInTheDocument(),
      );
    });

    it("omits notes row when notes is null", async () => {
      mockSuccessResponse(buildFactDetail({ notes: null }));
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText("Scientific Consensus")).toBeInTheDocument(),
      );
      expect(screen.queryByText(/Notes/i)).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows an error message when fetch fails with a server error", async () => {
      mockErrorResponse(404, "Verified fact not found");
      render(<FactDetailModal factText="unknown fact" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
      expect(screen.getByText("Verified fact not found")).toBeInTheDocument();
    });

    it("shows an error message when the network throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));
      render(<FactDetailModal factText="some fact" onClose={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });

  describe("close behaviour", () => {
    it("calls onClose when the close button is clicked", async () => {
      mockSuccessResponse(buildFactDetail());
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<FactDetailModal factText="water boils at 100" onClose={onClose} />);
      await user.click(screen.getByRole("button", { name: /close verification detail/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the Escape key is pressed", async () => {
      mockSuccessResponse(buildFactDetail());
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<FactDetailModal factText="water boils at 100" onClose={onClose} />);
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop is clicked", async () => {
      mockSuccessResponse(buildFactDetail());
      const onClose = jest.fn();
      const user = userEvent.setup();
      const { container } = render(
        <FactDetailModal factText="water boils at 100" onClose={onClose} />,
      );
      const backdrop = container.querySelector("[aria-hidden='true']") as HTMLElement;
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("API call", () => {
    it("fetches from verified-detail endpoint with the correct text param", async () => {
      mockSuccessResponse(buildFactDetail());
      render(<FactDetailModal factText="water boils at 100" onClose={jest.fn()} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/api/facts/verified-detail");
      expect(url).toContain("text=");
    });

    it("re-fetches when factText changes", async () => {
      mockSuccessResponse(buildFactDetail());
      mockSuccessResponse(buildFactDetail({ matchedFact: "The sun is a star." }));
      const { rerender } = render(
        <FactDetailModal factText="water boils at 100" onClose={jest.fn()} />,
      );
      await waitFor(() =>
        expect(screen.getByText("Water boils at 100 degrees Celsius.")).toBeInTheDocument(),
      );
      await act(async () => {
        rerender(<FactDetailModal factText="the sun is a star" onClose={jest.fn()} />);
      });
      await waitFor(() =>
        expect(screen.getByText("The sun is a star.")).toBeInTheDocument(),
      );
    });
  });
});
