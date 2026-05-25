import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatbotHomePage from "@/components/ChatbotHomePage";

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

describe("ChatbotHomePage", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("initial render", () => {
    it("renders the chatbot title", () => {
      render(<ChatbotHomePage />);
      expect(
        screen.getByRole("heading", { name: /factcheck chatbot/i }),
      ).toBeInTheDocument();
    });

    it("renders module navigation links", () => {
      render(<ChatbotHomePage />);
      const nav = screen.getByRole("navigation", { name: /module navigation/i });
      expect(nav).toBeInTheDocument();

      expect(
        screen.getByRole("link", { name: /upload documents/i }),
      ).toHaveAttribute("href", "/upload");
      expect(
        screen.getByRole("link", { name: /extract facts/i }),
      ).toHaveAttribute("href", "/extract");
      expect(
        screen.getByRole("link", { name: /verify facts/i }),
      ).toHaveAttribute("href", "/verify");
    });

    it("shows the empty-state prompt when no messages exist", () => {
      render(<ChatbotHomePage />);
      expect(
        screen.getByText(/ask a question to get started/i),
      ).toBeInTheDocument();
    });

    it("renders the chat input and send button", () => {
      render(<ChatbotHomePage />);
      expect(
        screen.getByRole("textbox", { name: /chat input/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /send message/i }),
      ).toBeInTheDocument();
    });

    it("disables the send button when input is empty", () => {
      render(<ChatbotHomePage />);
      expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
    });
  });

  describe("sending messages", () => {
    it("displays the user message immediately after sending", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          reply: "A verified response from the assistant.",
          verificationStatus: "verified",
        }),
      });

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      await user.type(
        screen.getByRole("textbox", { name: /chat input/i }),
        "What is photosynthesis?",
      );
      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(
        screen.getByText("What is photosynthesis?"),
      ).toBeInTheDocument();
    });

    it("shows a checking badge while awaiting the assistant reply", async () => {
      let resolve: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      await user.type(
        screen.getByRole("textbox", { name: /chat input/i }),
        "Test question",
      );
      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(screen.getByText(/checking/i)).toBeInTheDocument();

      resolve!({
        json: async () => ({ reply: "Done.", verificationStatus: "none" }),
      });
    });

    it("renders the assistant reply with a verified badge", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          reply: "This is a fully verified factual response from the assistant.",
          verificationStatus: "verified",
        }),
      });

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      await user.type(
        screen.getByRole("textbox", { name: /chat input/i }),
        "Verified question",
      );
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() =>
        expect(
          screen.getByText(
            "This is a fully verified factual response from the assistant.",
          ),
        ).toBeInTheDocument(),
      );

      expect(screen.getByText(/✓ verified/i)).toBeInTheDocument();
    });

    it("renders the assistant reply with an unverified badge", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          reply: "Short reply.",
          verificationStatus: "unverified",
        }),
      });

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      await user.type(
        screen.getByRole("textbox", { name: /chat input/i }),
        "Unverified question",
      );
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() =>
        expect(screen.getByText(/⚠ unverified/i)).toBeInTheDocument(),
      );
    });

    it("clears the input after sending", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ reply: "OK.", verificationStatus: "none" }),
      });

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      const input = screen.getByRole("textbox", { name: /chat input/i });
      await user.type(input, "Hello");
      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(input).toHaveValue("");
    });
  });

  describe("error handling", () => {
    it("shows an error message when the fetch call fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<ChatbotHomePage />);

      await user.type(
        screen.getByRole("textbox", { name: /chat input/i }),
        "Failing request",
      );
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/an error occurred. please try again/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("routing integration", () => {
    it("module links navigate to the correct paths", () => {
      render(<ChatbotHomePage />);
      expect(screen.getByRole("link", { name: /upload documents/i })).toHaveAttribute("href", "/upload");
      expect(screen.getByRole("link", { name: /extract facts/i })).toHaveAttribute("href", "/extract");
      expect(screen.getByRole("link", { name: /verify facts/i })).toHaveAttribute("href", "/verify");
    });
  });
});
