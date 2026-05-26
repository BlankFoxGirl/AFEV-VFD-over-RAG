import type { Message } from "@/components/ChatbotHomePage";
import VerificationBadge from "@/components/VerificationBadge";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  message: Message;
  onBadgeClick?: (factText: string) => void;
};

function buildBadgeClickHandler(
  matchedFact: string | null | undefined,
  onBadgeClick: ((factText: string) => void) | undefined,
): (() => void) | undefined {
  if (matchedFact && onBadgeClick) {
    return () => onBadgeClick(matchedFact);
  }
  return undefined;
}

export default function ChatMessage({ message, onBadgeClick }: Props) {
  const isAssistant = message.role === "assistant";
  const badgeClickHandler = buildBadgeClickHandler(message.matchedFact, onBadgeClick);
  return (
    <div
      className={`${styles.message} ${isAssistant ? styles.assistant : styles.user}`}
    >
      <p className={styles.messageContent}>{message.content}</p>
      {isAssistant && (
        <VerificationBadge
          status={message.verificationStatus}
          onClick={badgeClickHandler}
        />
      )}
    </div>
  );
}
