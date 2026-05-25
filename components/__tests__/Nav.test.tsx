import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Nav from "@/components/Nav";

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

describe("Nav", () => {
  it("renders the brand link pointing to home", () => {
    render(<Nav />);
    const brand = screen.getByRole("link", { name: /factcheck/i });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute("href", "/");
  });

  it("renders all required navigation links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /upload/i })).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(screen.getByRole("link", { name: /extract/i })).toHaveAttribute(
      "href",
      "/extract",
    );
    expect(screen.getByRole("link", { name: /verify/i })).toHaveAttribute(
      "href",
      "/verify",
    );
    expect(screen.getByRole("link", { name: /chatbot/i })).toHaveAttribute(
      "href",
      "/chatbot",
    );
  });

  it("renders a toggle button for mobile navigation", () => {
    render(<Nav />);
    const toggle = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("expands navigation when toggle button is clicked", async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const toggle = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses navigation when toggle button is clicked twice", async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const toggle = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });

    await user.click(toggle);
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("has a landmark role for screen readers", () => {
    render(<Nav />);
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
  });
});
