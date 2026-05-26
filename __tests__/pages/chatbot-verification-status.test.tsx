import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import ChatbotHomePage from "@/components/ChatbotHomePage";
import Nav from "@/components/Nav";

async function sendMessage(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.type(screen.getByRole("textbox", { name: /chat input/i }), text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

function mockApiVerificationResponse(
  reply: string,
  verificationStatus: string,
) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ reply, verificationStatus }),
  });
}

describe("Chatbot UI – initial render", () => {
  it("renders with an empty message list on first load", () => {
    render(<ChatbotHomePage />);
    expect(
      screen.getByText(/ask a question to get started/i),
    ).toBeInTheDocument();
  });

  it("renders the chat input in an enabled state initially", () => {
    render(<ChatbotHomePage />);
    expect(
      screen.getByRole("textbox", { name: /chat input/i }),
    ).not.toBeDisabled();
  });

  it("renders the send button disabled when input is empty", () => {
    render(<ChatbotHomePage />);
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeDisabled();
  });

  it("renders no verification badges on initial render", () => {
    render(<ChatbotHomePage />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Chatbot UI – verification status display", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("displays a Verified label on assistant response with verified status", async () => {
    mockApiVerificationResponse(
      "Water boils at 100 degrees Celsius.",
      "verified",
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "What temperature does water boil at?");

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /fact verification status: verified/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/✓ verified/i)).toBeInTheDocument();
  });

  it("displays an Unverified label on assistant response with unverified status", async () => {
    mockApiVerificationResponse("I cannot confirm that claim.", "unverified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Is the moon made of cheese?");

    await waitFor(() =>
      expect(
        screen.getByRole("img", {
          name: /fact verification status: unverified/i,
        }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/⚠ unverified/i)).toBeInTheDocument();
  });

  it("shows a checking state while the API call is in flight", async () => {
    let resolveResponse: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "In-flight question");

    expect(
      screen.getByRole("img", { name: /fact verification status: checking/i }),
    ).toBeInTheDocument();

    resolveResponse!({
      json: async () => ({ reply: "Done.", verificationStatus: "none" }),
    });
  });

  it("shows an error message when the API call fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Failing question");

    await waitFor(() =>
      expect(
        screen.getByText(/an error occurred. please try again/i),
      ).toBeInTheDocument(),
    );
  });

  it("makes the POST request to /api/chat with the correct payload", async () => {
    mockApiVerificationResponse("Some reply.", "verified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Check verification status");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: "Check verification status" }),
      }),
    );
  });
});

describe("Chatbot UI – navigation integration", () => {
  it("Nav contains a Chatbot link pointing to the home route", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /chatbot/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("chatbot page is accessible from the main navigation", () => {
    render(<Nav />);
    const chatbotLink = screen.getByRole("link", { name: /chatbot/i });
    expect(chatbotLink).toBeInTheDocument();
  });
});
