import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExtractPage from "@/pages/extract";

jest.mock("next/head", () => {
  const MockHead = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  MockHead.displayName = "MockHead";
  return MockHead;
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ExtractPage", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders the page heading", () => {
    render(<ExtractPage />);
    expect(
      screen.getByRole("heading", { name: /extract facts/i }),
    ).toBeInTheDocument();
  });

  it("renders the document name input", () => {
    render(<ExtractPage />);
    expect(screen.getByLabelText(/document name/i)).toBeInTheDocument();
  });

  it("renders the document content textarea", () => {
    render(<ExtractPage />);
    expect(screen.getByLabelText(/document content/i)).toBeInTheDocument();
  });

  it("does not show DocumentFactList when content is empty", () => {
    render(<ExtractPage />);
    expect(
      screen.queryByRole("heading", { name: /extracted facts/i }),
    ).not.toBeInTheDocument();
  });

  it("shows DocumentFactList after content is typed", async () => {
    const user = userEvent.setup();
    render(<ExtractPage />);

    await user.type(
      screen.getByLabelText(/document content/i),
      "The library was founded in 1901.",
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /extracted facts/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows the Extract Facts button once content is entered", async () => {
    const user = userEvent.setup();
    render(<ExtractPage />);

    await user.type(
      screen.getByLabelText(/document content/i),
      "The project has 3 phases.",
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /extract facts from document/i }),
      ).toBeInTheDocument(),
    );
  });

  it("full flow: enters document content and extracts facts successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        facts: [
          {
            id: "f1",
            text: "The project has 3 phases.",
            context: "The project has 3 phases.",
            documentId: "doc-x",
            documentName: "My Doc",
          },
        ],
      }),
    });

    const user = userEvent.setup();
    render(<ExtractPage />);

    await user.type(
      screen.getByLabelText(/document name/i),
      "My Doc",
    );
    await user.type(
      screen.getByLabelText(/document content/i),
      "The project has 3 phases.",
    );

    const extractButton = await screen.findByRole("button", {
      name: /extract facts from document/i,
    });
    await user.click(extractButton);

    await waitFor(() =>
      expect(
        screen.getAllByText("The project has 3 phases.").length,
      ).toBeGreaterThan(0),
    );
  });

  it("shows error state when extraction API call fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Server unavailable"));

    const user = userEvent.setup();
    render(<ExtractPage />);

    await user.type(
      screen.getByLabelText(/document content/i),
      "The system was developed in 2010.",
    );

    const extractButton = await screen.findByRole("button", {
      name: /extract facts from document/i,
    });
    await user.click(extractButton);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByText("Server unavailable")).toBeInTheDocument();
  });
});
