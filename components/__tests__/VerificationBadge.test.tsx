import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerificationBadge from "@/components/VerificationBadge";
import type { VerificationStatus } from "@/lib/verification";

describe("VerificationBadge", () => {
  describe("verified status", () => {
    it("renders the verified label", () => {
      render(<VerificationBadge status="verified" />);
      expect(screen.getByText(/✓ verified/i)).toBeInTheDocument();
    });

    it("has accessible aria-label for verified", () => {
      render(<VerificationBadge status="verified" />);
      expect(
        screen.getByRole("img", { name: /fact verification status: verified/i }),
      ).toBeInTheDocument();
    });

    it("has a title tooltip for verified", () => {
      render(<VerificationBadge status="verified" />);
      expect(screen.getByTitle(/fact verification status: verified/i)).toBeInTheDocument();
    });
  });

  describe("unverified status", () => {
    it("renders the unverified label", () => {
      render(<VerificationBadge status="unverified" />);
      expect(screen.getByText(/⚠ unverified/i)).toBeInTheDocument();
    });

    it("has accessible aria-label for unverified", () => {
      render(<VerificationBadge status="unverified" />);
      expect(
        screen.getByRole("img", { name: /fact verification status: unverified/i }),
      ).toBeInTheDocument();
    });
  });

  describe("checking status", () => {
    it("renders the checking label", () => {
      render(<VerificationBadge status="checking" />);
      expect(screen.getByText(/checking/i)).toBeInTheDocument();
    });

    it("has accessible aria-label for checking", () => {
      render(<VerificationBadge status="checking" />);
      expect(
        screen.getByRole("img", { name: /fact verification status: checking/i }),
      ).toBeInTheDocument();
    });
  });

  describe("none status", () => {
    it("renders nothing when status is none", () => {
      const { container } = render(<VerificationBadge status="none" />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("all non-none statuses render a badge element", () => {
    const visibleStatuses: VerificationStatus[] = ["verified", "unverified", "checking"];

    it.each(visibleStatuses)("renders a badge for status %s", (status) => {
      render(<VerificationBadge status={status} />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});

describe("VerificationBadge – clickable variant", () => {
  it("renders as a button when onClick is provided", () => {
    render(<VerificationBadge status="verified" onClick={jest.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does not render role=img when onClick is provided", () => {
    render(<VerificationBadge status="verified" onClick={jest.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls onClick when the badge button is clicked", async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<VerificationBadge status="verified" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the same label text in clickable mode", () => {
    render(<VerificationBadge status="verified" onClick={jest.fn()} />);
    expect(screen.getByText(/✓ verified/i)).toBeInTheDocument();
  });

  it("has an accessible aria-label that mentions click for details", () => {
    render(<VerificationBadge status="unverified" onClick={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /click for details/i }),
    ).toBeInTheDocument();
  });

  it("renders as a non-clickable span when onClick is omitted", () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
