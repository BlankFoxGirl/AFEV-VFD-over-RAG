import { render, screen } from "@testing-library/react";
import ChatMessage from "@/components/ChatMessage";
import type { Message } from "@/components/ChatbotHomePage";

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "assistant",
    content: "This is a test response from the assistant.",
    verificationStatus: "verified",
    ...overrides,
  };
}

describe("ChatMessage", () => {
  describe("assistant messages", () => {
    it("renders the message content", () => {
      render(<ChatMessage message={buildMessage()} />);
      expect(
        screen.getByText("This is a test response from the assistant."),
      ).toBeInTheDocument();
    });

    it("shows a verified badge for assistant messages with verified status", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "verified" })} />);
      expect(
        screen.getByRole("img", { name: /fact verification status: verified/i }),
      ).toBeInTheDocument();
    });

    it("shows an unverified badge for assistant messages with unverified status", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "unverified" })} />);
      expect(
        screen.getByRole("img", { name: /fact verification status: unverified/i }),
      ).toBeInTheDocument();
    });

    it("shows a checking badge for assistant messages with checking status", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "checking" })} />);
      expect(
        screen.getByRole("img", { name: /fact verification status: checking/i }),
      ).toBeInTheDocument();
    });

    it("does not render a badge when verificationStatus is none", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "none" })} />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("user messages", () => {
    it("renders user message content", () => {
      render(
        <ChatMessage
          message={buildMessage({ role: "user", content: "Hello, world!", verificationStatus: "none" })}
        />,
      );
      expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    });

    it("does not render a verification badge for user messages", () => {
      render(
        <ChatMessage
          message={buildMessage({ role: "user", verificationStatus: "verified" })}
        />,
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("indicator alignment", () => {
    it("badge appears after message content within the same message container", () => {
      const { container } = render(
        <ChatMessage message={buildMessage({ verificationStatus: "verified" })} />,
      );
      const messageDiv = container.firstChild as HTMLElement;
      const badge = messageDiv.querySelector("[role='img']");
      const content = messageDiv.querySelector("p");
      expect(content).toBeInTheDocument();
      expect(badge).toBeInTheDocument();
    });

    it("renders the verified label text alongside the badge icon", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "verified" })} />);
      expect(screen.getByText(/✓ verified/i)).toBeInTheDocument();
    });

    it("renders the unverified warning label alongside the badge icon", () => {
      render(<ChatMessage message={buildMessage({ verificationStatus: "unverified" })} />);
      expect(screen.getByText(/⚠ unverified/i)).toBeInTheDocument();
    });
  });
});
