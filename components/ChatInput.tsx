"use client";

import { useState, type FormEvent } from "react";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  onSend: (message: string) => void;
  isDisabled: boolean;
};

export default function ChatInput({ onSend, isDisabled }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form className={styles.inputForm} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask a question…"
        disabled={isDisabled}
        aria-label="Chat input"
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={isDisabled || value.trim().length === 0}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
}
