import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatbotHomePage from "@/components/ChatbotHomePage";
import { uploadDocument } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  uploadDocument: jest.fn(),
}));

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUploadDocument = uploadDocument as jest.Mock;

function createTextFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("Document upload integration – within chatbot interface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the document upload button within the chat interface", () => {
    render(<ChatbotHomePage />);
    expect(
      screen.getByRole("button", { name: /attach document/i }),
    ).toBeInTheDocument();
  });

  it("renders the chat input alongside the upload button", () => {
    render(<ChatbotHomePage />);
    expect(screen.getByRole("textbox", { name: /chat input/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /attach document/i })).toBeInTheDocument();
  });

  it("shows uploading status in real-time after file selection", async () => {
    let resolveUpload: (value: unknown) => void;
    mockUploadDocument.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile("report.txt", "Carbon dioxide has the formula CO2."),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/uploading report\.txt/i),
    );

    resolveUpload!({ documentName: "report.txt", factCount: 1 });
  });

  it("displays success message with fact count after upload completes", async () => {
    mockUploadDocument.mockResolvedValueOnce({
      documentId: "doc_abc",
      documentName: "climate.txt",
      factCount: 5,
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile(
        "climate.txt",
        "CO2 levels have risen by 50%. The global temperature has increased by 1.2°C.",
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /5 facts extracted from climate\.txt/i,
      ),
    );
  });

  it("upload and chat can be used independently without interfering", async () => {
    mockUploadDocument.mockResolvedValueOnce({
      documentId: "doc_xyz",
      documentName: "facts.txt",
      factCount: 2,
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        reply: "Photosynthesis converts sunlight into energy.",
        verificationStatus: "verified",
      }),
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile("facts.txt", "Plants produce oxygen. Trees absorb CO2."),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/2 facts extracted/i),
    );

    await user.type(
      screen.getByRole("textbox", { name: /chat input/i }),
      "What is photosynthesis?",
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Photosynthesis converts sunlight into energy."),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/2 facts extracted/i);
  });

  it("shows an error in the upload status when upload fails", async () => {
    mockUploadDocument.mockRejectedValueOnce(new Error("Server error"));

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile("broken.txt", "Some data here."),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /upload failed. please try again/i,
      ),
    );
  });
});

describe("E2E – complete upload and processing cycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("simulates a full cycle: file selection → uploading feedback → success with fact count", async () => {
    let resolveUpload: (value: unknown) => void;
    mockUploadDocument.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    const fileContent =
      "The Earth is the third planet from the Sun. It has one natural satellite. The Moon orbits Earth every 27 days.";

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile("earth.txt", fileContent),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/uploading earth\.txt/i),
    );

    expect(
      screen.getByRole("button", { name: /attach document/i }),
    ).toBeDisabled();

    resolveUpload!({ documentName: "earth.txt", factCount: 3 });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /3 facts extracted from earth\.txt/i,
      ),
    );

    expect(
      screen.getByRole("button", { name: /attach document/i }),
    ).not.toBeDisabled();
  });

  it("document processing initiates automatically and user can query facts after upload", async () => {
    mockUploadDocument.mockResolvedValueOnce({
      documentId: "doc_earth",
      documentName: "science.txt",
      factCount: 4,
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        reply: "Water covers 71% of Earth's surface.",
        verificationStatus: "verified",
      }),
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await user.upload(
      screen.getByTestId("file-input"),
      createTextFile(
        "science.txt",
        "Water covers 71% of the Earth's surface. The ocean has an average depth of 3.7 km.",
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /4 facts extracted from science\.txt/i,
      ),
    );

    await user.type(
      screen.getByRole("textbox", { name: /chat input/i }),
      "What percentage of Earth is covered by water?",
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Water covers 71% of Earth's surface."),
      ).toBeInTheDocument(),
    );
  });
});
