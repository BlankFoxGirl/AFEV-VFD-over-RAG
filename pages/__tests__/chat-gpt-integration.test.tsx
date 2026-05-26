jest.mock("@/lib/factVerificationService", () => ({
  resolveVerificationStatus: jest.fn(),
  fetchVerifiedFactTexts: jest.fn(),
}));

jest.mock("@/lib/openaiClient", () => ({
  fetchChatCompletion: jest.fn(),
  buildChatMessages: jest.fn((userMessage, systemPrompt) => [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]),
}));

jest.mock("@/lib/embeddingService", () => ({
  generateEmbeddingContext: jest.fn(),
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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatbotHomePage from "@/components/ChatbotHomePage";
import { resolveVerificationStatus, fetchVerifiedFactTexts } from "@/lib/factVerificationService";
import { fetchChatCompletion } from "@/lib/openaiClient";
import { generateEmbeddingContext } from "@/lib/embeddingService";

const mockResolveVerificationStatus = resolveVerificationStatus as jest.Mock;
const mockFetchVerifiedFactTexts = fetchVerifiedFactTexts as jest.Mock;
const mockFetchChatCompletion = fetchChatCompletion as jest.Mock;
const mockGenerateEmbeddingContext = generateEmbeddingContext as jest.Mock;

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockChatApiResponse(reply: string, verificationStatus: string) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ reply, verificationStatus }),
  });
}

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: /chat input/i }), text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

describe("ChatGPT integration – end-to-end user session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveVerificationStatus.mockResolvedValue({ status: "verified", similarity: 1, matchedFact: null });
    mockFetchVerifiedFactTexts.mockResolvedValue(["The sun is a star"]);
    mockGenerateEmbeddingContext.mockResolvedValue("Verified facts for context:\nThe sun is a star");
    mockFetchChatCompletion.mockResolvedValue("The sun is indeed a star.");
  });

  it("displays a ChatGPT response after the user sends a message", async () => {
    mockChatApiResponse("The sun is a star located in the Milky Way.", "verified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "Tell me about the sun");

    await waitFor(() =>
      expect(screen.getByText("The sun is a star located in the Milky Way.")).toBeInTheDocument(),
    );
  });

  it("shows a verified badge when ChatGPT returns a verified response", async () => {
    mockChatApiResponse("Water freezes at 0°C.", "verified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "At what temperature does water freeze?");

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /fact verification status: verified/i })).toBeInTheDocument(),
    );
  });

  it("shows an unverified badge when ChatGPT returns an unverified response", async () => {
    mockChatApiResponse("I am not sure about that.", "unverified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "Is the moon made of cheese?");

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /fact verification status: unverified/i })).toBeInTheDocument(),
    );
  });

  it("simulates a full multi-turn conversation with ChatGPT responses", async () => {
    mockChatApiResponse("The Eiffel Tower is in Paris, France.", "verified");
    mockChatApiResponse("It was built in 1889.", "verified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "Where is the Eiffel Tower?");
    await waitFor(() =>
      expect(screen.getByText("The Eiffel Tower is in Paris, France.")).toBeInTheDocument(),
    );

    await sendMessage(user, "When was it built?");
    await waitFor(() =>
      expect(screen.getByText("It was built in 1889.")).toBeInTheDocument(),
    );

    const verifiedBadges = screen.getAllByRole("img", { name: /fact verification status: verified/i });
    expect(verifiedBadges).toHaveLength(2);
  });

  it("processes embedding context and sends it to ChatGPT for contextual answers", async () => {
    mockChatApiResponse("Mars is the fourth planet from the sun.", "verified");

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    await sendMessage(user, "Tell me about Mars");

    await waitFor(() =>
      expect(screen.getByText("Mars is the fourth planet from the sun.")).toBeInTheDocument(),
    );
  });

  it("shows the checking indicator during loading and replaces it once the response arrives", async () => {
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
        reply: "DNA is a molecule carrying genetic information.",
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
});
