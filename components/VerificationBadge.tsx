import type { VerificationStatus } from "@/lib/verification";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  status: VerificationStatus;
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: "✓ Verified",
  unverified: "⚠ Unverified",
  checking: "⟳ Checking…",
  none: "",
};

const STATUS_ARIA_LABEL: Record<VerificationStatus, string> = {
  verified: "Fact verification status: verified",
  unverified: "Fact verification status: unverified",
  checking: "Fact verification status: checking",
  none: "",
};

const STATUS_CLASS: Record<VerificationStatus, string> = {
  verified: styles.badgeVerified,
  unverified: styles.badgeUnverified,
  checking: styles.badgeChecking,
  none: "",
};

export default function VerificationBadge({ status }: Props) {
  if (status === "none") return null;
  return (
    <span
      className={`${styles.badge} ${STATUS_CLASS[status]}`}
      aria-label={STATUS_ARIA_LABEL[status]}
      title={STATUS_ARIA_LABEL[status]}
      role="img"
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
