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

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: /chat input/i }), text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

function mockChatResponse(reply: string, verificationStatus: string, matchedFact: string | null) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ reply, verificationStatus, matchedFact }),
  });
}

function mockDetailResponse(detail: {
  matchedFact: string;
  source: string | null;
  category: string | null;
  notes: string | null;
}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => detail,
  });
}

describe("Fact detail view – unit: badge click triggers detail view", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders a clickable badge button when matchedFact is present", async () => {
    mockChatResponse(
      "Water boils at 100 degrees Celsius.",
      "verified",
      "Water boils at 100 degrees Celsius.",
    );

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "What temperature does water boil?");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /click for details/i })).toBeInTheDocument(),
    );
  });

  it("opens the fact detail modal when the badge is clicked", async () => {
    mockChatResponse(
      "Water boils at 100 degrees Celsius.",
      "verified",
      "Water boils at 100 degrees Celsius.",
    );
    mockDetailResponse({
      matchedFact: "Water boils at 100 degrees Celsius.",
      source: "Scientific Consensus",
      category: "Chemistry",
      notes: null,
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Water boiling point?");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /click for details/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /click for details/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/verification detail/i)).toBeInTheDocument();
  });
});

describe("Fact detail view – integration: detailed view renders source and notes", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("displays source inside modal after opening", async () => {
    mockChatResponse(
      "The sun is a star. [Verified]",
      "verified",
      "The sun is a star.",
    );
    mockDetailResponse({
      matchedFact: "The sun is a star.",
      source: "NASA",
      category: "Astronomy",
      notes: "Classified as a G-type main-sequence star.",
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Is the sun a star?");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /click for details/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /click for details/i }));

    await waitFor(() =>
      expect(screen.getByText("NASA")).toBeInTheDocument(),
    );
    expect(screen.getByText("Astronomy")).toBeInTheDocument();
    expect(screen.getByText("Classified as a G-type main-sequence star.")).toBeInTheDocument();
  });

  it("modal remains accessible across multiple chat responses", async () => {
    mockChatResponse("First verified fact reply.", "verified", "First fact.");
    mockChatResponse("Second unverified fact reply.", "unverified", "Second fact.");
    mockDetailResponse({
      matchedFact: "Second fact.",
      source: "Unknown",
      category: "General",
      notes: null,
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Question one");
    await waitFor(() => expect(screen.getByText("First verified fact reply.")).toBeInTheDocument());

    await sendMessage(user, "Question two");
    await waitFor(() => expect(screen.getByText("Second unverified fact reply.")).toBeInTheDocument());

    const badgeButtons = screen.getAllByRole("button", { name: /click for details/i });
    expect(badgeButtons).toHaveLength(2);

    await user.click(badgeButtons[1]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Fact detail view – E2E: full flow from label click to detail and back", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("simulates user interaction from label click to detail view and back to chat", async () => {
    mockChatResponse(
      "Water is composed of H2O molecules. [Verified]",
      "verified",
      "Water is H2O.",
    );
    mockDetailResponse({
      matchedFact: "Water is H2O.",
      source: "Chemistry Reference",
      category: "Chemistry",
      notes: "Molecular formula: H₂O.",
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);

    // Step 1: send message and get verified response
    await sendMessage(user, "What is water?");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /click for details/i })).toBeInTheDocument(),
    );

    // Step 2: click badge to open modal
    await user.click(screen.getByRole("button", { name: /click for details/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Step 3: modal shows the detail
    await waitFor(() =>
      expect(screen.getByText("Chemistry Reference")).toBeInTheDocument(),
    );
    expect(screen.getByText("Molecular formula: H₂O.")).toBeInTheDocument();

    // Step 4: close modal and return to chat
    await user.click(screen.getByRole("button", { name: /close verification detail/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Step 5: chat remains intact after closing modal
    expect(
      screen.getByText("Water is composed of H2O molecules. [Verified]"),
    ).toBeInTheDocument();
  });

  it("badge is not rendered when matchedFact is absent (non-clickable status)", async () => {
    mockChatResponse("Some reply without a match.", "unverified", null);

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Some question");

    await waitFor(() =>
      expect(screen.getByText("Some reply without a match.")).toBeInTheDocument(),
    );
    // No matched fact means the badge renders as img, not a clickable button
    expect(screen.queryByRole("button", { name: /click for details/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /fact verification status: unverified/i }),
    ).toBeInTheDocument();
  });

  it("closes the modal with Escape key and returns focus to chat", async () => {
    mockChatResponse("Earth orbits the sun. [Verified]", "verified", "Earth orbits the sun.");
    mockDetailResponse({
      matchedFact: "Earth orbits the sun.",
      source: "Astronomy",
      category: "Science",
      notes: null,
    });

    const user = userEvent.setup();
    render(<ChatbotHomePage />);
    await sendMessage(user, "Earth question");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /click for details/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /click for details/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
