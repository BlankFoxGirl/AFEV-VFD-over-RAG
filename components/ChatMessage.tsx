import type { Message } from "@/components/ChatbotHomePage";
import VerificationBadge from "@/components/VerificationBadge";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  message: Message;
};

export default function ChatMessage({ message }: Props) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={`${styles.message} ${isAssistant ? styles.assistant : styles.user}`}
    >
      <p className={styles.messageContent}>{message.content}</p>
      {isAssistant && <VerificationBadge status={message.verificationStatus} />}
    </div>
  );
}
