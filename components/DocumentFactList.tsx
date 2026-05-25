"use client";

import { useState } from "react";
import styles from "@/styles/DocumentFactList.module.css";

export type Fact = {
  id: string;
  text: string;
  context: string;
  documentId: string;
  documentName?: string;
};

export type DocumentFactListProps = {
  documentId: string;
  documentName?: string;
  content: string;
};

type ExtractionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; facts: Fact[] }
  | { status: "error"; message: string };

async function fetchExtractedFacts(
  documentId: string,
  content: string,
  documentName: string,
): Promise<Fact[]> {
  const response = await fetch("/api/extract-facts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, content, documentName }),
  });
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Extraction failed");
  }
  const { facts } = (await response.json()) as { facts: Fact[] };
  return facts;
}

function FactItem({ fact }: { fact: Fact }) {
  return (
    <li className={styles.factItem}>
      <p className={styles.factText}>{fact.text}</p>
      <p className={styles.factContext}>{fact.context}</p>
    </li>
  );
}

function LoadingState() {
  return (
    <div className={styles.statusContainer} role="status" aria-live="polite">
      <span className={styles.loadingText}>Extracting facts...</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.statusContainer} role="alert">
      <span className={styles.errorText}>{message}</span>
    </div>
  );
}

function EmptyIdle() {
  return (
    <p className={styles.emptyState}>
      No facts extracted yet. Click &ldquo;Extract Facts&rdquo; to begin.
    </p>
  );
}

function FactsList({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) {
    return (
      <p className={styles.emptyState}>No facts found in this document.</p>
    );
  }
  return (
    <ul className={styles.factsList} aria-label="Extracted facts">
      {facts.map((fact) => (
        <FactItem key={fact.id} fact={fact} />
      ))}
    </ul>
  );
}

export default function DocumentFactList({
  documentId,
  documentName = "Untitled Document",
  content,
}: DocumentFactListProps) {
  const [state, setState] = useState<ExtractionState>({ status: "idle" });

  async function handleExtract() {
    setState({ status: "loading" });
    try {
      const facts = await fetchExtractedFacts(documentId, content, documentName);
      setState({ status: "success", facts });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ status: "error", message });
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Extracted Facts</h2>
        <button
          className={styles.extractButton}
          onClick={handleExtract}
          disabled={state.status === "loading"}
          aria-label="Extract facts from document"
        >
          {state.status === "loading" ? "Extracting..." : "Extract Facts"}
        </button>
      </div>

      {state.status === "idle" && <EmptyIdle />}
      {state.status === "loading" && <LoadingState />}
      {state.status === "error" && <ErrorState message={state.message} />}
      {state.status === "success" && <FactsList facts={state.facts} />}
    </div>
  );
}
