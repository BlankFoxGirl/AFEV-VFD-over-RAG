import { render, screen } from "@testing-library/react";
import FactVerificationPage from "@/pages/fact-verification";

jest.mock("next/head", () => {
  const MockHead = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  MockHead.displayName = "MockHead";
  return MockHead;
});

describe("FactVerificationPage", () => {
  it("renders without error", () => {
    render(<FactVerificationPage />);
    expect(document.body).toBeTruthy();
  });

  it("renders the page heading", () => {
    render(<FactVerificationPage />);
    expect(
      screen.getByRole("heading", { name: /fact verification/i }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<FactVerificationPage />);
    expect(
      screen.getByText(/review extracted facts and verify their accuracy/i),
    ).toBeInTheDocument();
  });

  it("renders the facts list placeholder", () => {
    render(<FactVerificationPage />);
    expect(
      screen.getByLabelText(/facts list placeholder/i),
    ).toBeInTheDocument();
  });

  it("renders placeholder text directing the user to extract facts first", () => {
    render(<FactVerificationPage />);
    expect(
      screen.getByText(/verified facts will appear here/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/extract and annotate facts first/i),
    ).toBeInTheDocument();
  });

  it("renders the facts grid container", () => {
    render(<FactVerificationPage />);
    const placeholder = screen.getByLabelText(/facts list placeholder/i);
    expect(placeholder.parentElement).toBeInTheDocument();
  });
});
