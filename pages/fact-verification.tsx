import Head from "next/head";
import { useEffect, useState } from "react";
import { fetchFacts } from "@/lib/apiClient";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";
import styles from "@/styles/FactVerification.module.css";

function FactsListPlaceholder() {
  return (
    <div className={styles.placeholder} aria-label="Facts list placeholder">
      <span className={styles.placeholderIcon} aria-hidden="true">
        🔍
      </span>
      <p>Verified facts will appear here.</p>
      <p>Extract and annotate facts first to begin verification.</p>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      Loading facts…
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className={styles.errorState} role="alert">
      {message}
    </div>
  );
}

function VerificationFactCard({ fact }: { fact: FactWithAnnotations }) {
  return (
    <article
      className={styles.factCard}
      aria-label={`Fact: ${fact.text}`}
    >
      <p className={styles.factCardText}>{fact.text}</p>
      <p className={styles.factCardContext}>{fact.context}</p>
      <p className={styles.factCardMeta}>{fact.documentName}</p>
    </article>
  );
}

function FactsGridContent({ facts }: { facts: FactWithAnnotations[] }) {
  if (facts.length === 0) {
    return <FactsListPlaceholder />;
  }
  return (
    <>
      {facts.map((fact) => (
        <VerificationFactCard key={fact.id} fact={fact} />
      ))}
    </>
  );
}

export default function FactVerificationPage() {
  const [facts, setFacts] = useState<FactWithAnnotations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFacts()
      .then((loadedFacts: FactWithAnnotations[]) => {
        setFacts(loadedFacts);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load facts";
        setError(message);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Head>
        <title>FactCheck – Fact Verification</title>
        <meta
          name="description"
          content="Review and verify extracted facts from your documents."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <h1 className={styles.title}>Fact Verification</h1>
        <p className={styles.description}>
          Review extracted facts and verify their accuracy.
        </p>
        <div className={styles.factsGrid}>
          {loading && <LoadingIndicator />}
          {!loading && error && <ErrorMessage message={error} />}
          {!loading && !error && <FactsGridContent facts={facts} />}
        </div>
      </div>
    </>
  );
}
