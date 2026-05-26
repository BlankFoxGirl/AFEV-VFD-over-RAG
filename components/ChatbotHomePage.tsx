"use client";

import { useState } from "react";
import Link from "next/link";
import type { VerificationStatus } from "@/lib/verification";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import DocumentUpload, { type UploadResult } from "@/components/DocumentUpload";
import FactDetailModal from "@/components/FactDetailModal";
import styles from "@/styles/Chatbot.module.css";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  verificationStatus: VerificationStatus;
  matchedFact?: string | null;
};

const MODULE_LINKS = [
  { href: "/upload", label: "Upload Documents" },
  { href: "/extract", label: "Extract Facts" },
  { href: "/verify", label: "Verify Facts" },
] as const;

function createUserMessage(content: string): Message {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    verificationStatus: "none",
  };
}

function createAssistantPlaceholder(): Message {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "…",
    verificationStatus: "checking",
  };
}

function buildUploadSummaryText(result: UploadResult): string {
  const factLabel = result.factCount !== 1 ? "facts" : "fact";
  const base = `Document "${result.documentName}" processed: ${result.factCount} ${factLabel} extracted`;
  if (!result.verificationSummary) return `${base}.`;
  const { verified, unverified } = result.verificationSummary;
  return `${base} (${verified} verified, ${unverified} unverified).`;
}

function createUploadNotificationMessage(result: UploadResult): Message {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: buildUploadSummaryText(result),
    verificationStatus: "none",
  };
}

async function fetchChatResponse(
  message: string,
): Promise<{ reply: string; verificationStatus: VerificationStatus; matchedFact: string | null }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export default function ChatbotHomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFactText, setSelectedFactText] = useState<string | null>(null);

  const appendMessages = (userMsg: Message, placeholder: Message) =>
    setMessages((prev) => [...prev, userMsg, placeholder]);

  const resolveAssistantMessage = (
    placeholderId: string,
    content: string,
    verificationStatus: VerificationStatus,
    matchedFact: string | null,
  ) =>
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === placeholderId
          ? { ...msg, content, verificationStatus, matchedFact }
          : msg,
      ),
    );

  const handleUploadComplete = (result: UploadResult) => {
    setMessages((prev) => [...prev, createUploadNotificationMessage(result)]);
  };

  const handleSend = async (content: string) => {
    const userMsg = createUserMessage(content);
    const placeholder = createAssistantPlaceholder();
    appendMessages(userMsg, placeholder);
    setIsLoading(true);

    try {
      const { reply, verificationStatus, matchedFact } = await fetchChatResponse(content);
      resolveAssistantMessage(placeholder.id, reply, verificationStatus, matchedFact ?? null);
    } catch {
      resolveAssistantMessage(
        placeholder.id,
        "An error occurred. Please try again.",
        "none",
        null,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>FactCheck Chatbot</h1>
        <nav className={styles.quickLinks} aria-label="Module navigation">
          {MODULE_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={styles.quickLink}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className={styles.messages} role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className={styles.emptyState}>
            Ask a question to get started. Responses will be verified for
            accuracy.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onBadgeClick={setSelectedFactText}
          />
        ))}
      </div>
      {selectedFactText && (
        <FactDetailModal
          factText={selectedFactText}
          onClose={() => setSelectedFactText(null)}
        />
      )}
      <div className={styles.inputRow}>
        <DocumentUpload onUploadComplete={handleUploadComplete} />
        <ChatInput onSend={handleSend} isDisabled={isLoading} />
      </div>
    </div>
  );
}
