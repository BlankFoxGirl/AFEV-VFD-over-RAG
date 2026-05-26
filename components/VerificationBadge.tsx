import type { VerificationStatus } from "@/lib/verification";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  status: VerificationStatus;
  onClick?: () => void;
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

function ClickableBadge({ status, onClick }: Required<Props>) {
  return (
    <button
      type="button"
      className={`${styles.badge} ${styles.badgeButton} ${STATUS_CLASS[status]}`}
      aria-label={`${STATUS_ARIA_LABEL[status]} – click for details`}
      onClick={onClick}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

function StaticBadge({ status }: { status: VerificationStatus }) {
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

export default function VerificationBadge({ status, onClick }: Props) {
  if (status === "none") return null;
  if (onClick) return <ClickableBadge status={status} onClick={onClick} />;
  return <StaticBadge status={status} />;
}
