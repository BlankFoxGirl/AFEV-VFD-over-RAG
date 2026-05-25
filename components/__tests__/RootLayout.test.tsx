import { render, screen } from "@testing-library/react";
import RootLayout from "@/components/RootLayout";

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

describe("RootLayout", () => {
  it("renders the navigation bar", () => {
    render(
      <RootLayout>
        <div>page content</div>
      </RootLayout>,
    );
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
  });

  it("renders children inside the main element", () => {
    render(
      <RootLayout>
        <p>hello world</p>
      </RootLayout>,
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent("hello world");
  });

  it("integrates Nav links with the page shell", () => {
    render(
      <RootLayout>
        <section aria-label="page body">content</section>
      </RootLayout>,
    );
    expect(screen.getByRole("link", { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /extract/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /verify/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /chatbot/i })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /page body/i }),
    ).toBeInTheDocument();
  });
});
