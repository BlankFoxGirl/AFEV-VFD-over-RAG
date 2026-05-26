import { render, screen } from "@testing-library/react";
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
