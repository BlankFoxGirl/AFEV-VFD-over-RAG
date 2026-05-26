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

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: /chat input/i }), text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

describe("Chatbot visual indicators – E2E flow", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("shows a checking indicator immediately after sending and replaces it with verified", async () => {
    let resolveResponse: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "What is DNA?");

    expect(screen.getByRole("img", { name: /fact verification status: checking/i })).toBeInTheDocument();

    resolveResponse!({
      json: async () => ({
        reply: "DNA is a molecule that carries genetic instructions.",
        verificationStatus: "verified",
      }),
    });

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /fact verification status: verified/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("img", { name: /fact verification status: checking/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a checking indicator and replaces it with unverified on low-confidence reply", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        reply: "Maybe.",
        verificationStatus: "unverified",
      }),
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Is the sky green?");

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /fact verification status: unverified/i }),
      ).toBeInTheDocument(),
    );
  });

  it("does not show any verification indicator on user messages", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ reply: "Yes.", verificationStatus: "none" }),
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Simple question");

    expect(screen.getByText("Simple question")).toBeInTheDocument();
    const userBubble = screen.getByText("Simple question").closest("div");
    expect(userBubble?.querySelector("[role='img']")).toBeNull();
  });

  it("renders sequential messages each with their own indicator", async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          reply: "First verified reply from the assistant system.",
          verificationStatus: "verified",
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          reply: "Short.",
          verificationStatus: "unverified",
        }),
      });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "Question one");
    await waitFor(() =>
      expect(screen.getByText(/first verified reply/i)).toBeInTheDocument(),
    );

    await sendMessage(user, "Question two");
    await waitFor(() =>
      expect(screen.getByText("Short.")).toBeInTheDocument(),
    );

    const verifiedBadges = screen.getAllByRole("img", {
      name: /fact verification status: verified/i,
    });
    expect(verifiedBadges).toHaveLength(1);

    const unverifiedBadges = screen.getAllByRole("img", {
      name: /fact verification status: unverified/i,
    });
    expect(unverifiedBadges).toHaveLength(1);
  });

  it("does not render any badge when status is none on assistant reply", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ reply: "Okay.", verificationStatus: "none" }),
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Neutral question");

    await waitFor(() =>
      expect(screen.getByText("Okay.")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
