import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentUpload from "@/components/DocumentUpload";
import { uploadDocument } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  uploadDocument: jest.fn(),
}));

const mockUploadDocument = uploadDocument as jest.Mock;

function createTextFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("DocumentUpload – unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the attach button", () => {
      render(<DocumentUpload />);
      expect(
        screen.getByRole("button", { name: /attach document/i }),
      ).toBeInTheDocument();
    });

    it("renders a hidden file input", () => {
      render(<DocumentUpload />);
      expect(screen.getByTestId("file-input")).toBeInTheDocument();
    });

    it("does not show a status message initially", () => {
      render(<DocumentUpload />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("file selection and upload", () => {
    it("shows uploading status after file is selected", async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadDocument.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      );

      const user = userEvent.setup();
      render(<DocumentUpload />);

      const fileInput = screen.getByTestId("file-input");
      const file = createTextFile("report.txt", "The sky is blue. Water is wet.");

      await user.upload(fileInput, file);

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/uploading report\.txt/i),
      );

      resolveUpload!({ documentName: "report.txt", factCount: 2 });
    });

    it("shows success status with fact count after upload completes", async () => {
      mockUploadDocument.mockResolvedValueOnce({
        documentId: "doc_123",
        documentName: "notes.txt",
        factCount: 3,
      });

      const user = userEvent.setup();
      render(<DocumentUpload />);

      const fileInput = screen.getByTestId("file-input");
      const file = createTextFile(
        "notes.txt",
        "Earth has one moon. Mars has two moons. Jupiter has 95 moons.",
      );

      await user.upload(fileInput, file);

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          /3 facts extracted from notes\.txt/i,
        ),
      );
    });

    it("uses singular 'fact' when exactly one fact is extracted", async () => {
      mockUploadDocument.mockResolvedValueOnce({
        documentId: "doc_456",
        documentName: "single.txt",
        factCount: 1,
      });

      const user = userEvent.setup();
      render(<DocumentUpload />);

      await user.upload(
        screen.getByTestId("file-input"),
        createTextFile("single.txt", "Water is wet."),
      );

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/1 fact extracted/i),
      );
    });

    it("calls uploadDocument with the file name and its text content", async () => {
      mockUploadDocument.mockResolvedValueOnce({
        documentId: "doc_789",
        documentName: "data.txt",
        factCount: 1,
      });

      const user = userEvent.setup();
      render(<DocumentUpload />);

      const content = "The Earth orbits the Sun.";
      await user.upload(
        screen.getByTestId("file-input"),
        createTextFile("data.txt", content),
      );

      await waitFor(() =>
        expect(mockUploadDocument).toHaveBeenCalledWith("data.txt", content),
      );
    });
  });

  describe("error handling", () => {
    it("shows an error message when upload fails", async () => {
      mockUploadDocument.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<DocumentUpload />);

      await user.upload(
        screen.getByTestId("file-input"),
        createTextFile("bad.txt", "Some content here."),
      );

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          /upload failed. please try again/i,
        ),
      );
    });
  });

  describe("interaction states", () => {
    it("disables the attach button while uploading", async () => {
      let resolveUpload: (value: unknown) => void;
      mockUploadDocument.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      );

      const user = userEvent.setup();
      render(<DocumentUpload />);

      await user.upload(
        screen.getByTestId("file-input"),
        createTextFile("doc.txt", "Water is composed of hydrogen and oxygen."),
      );

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /attach document/i })).toBeDisabled(),
      );

      resolveUpload!({ documentName: "doc.txt", factCount: 1 });
    });
  });
});
