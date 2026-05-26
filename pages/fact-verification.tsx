import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { fetchFacts, verifyFact } from "@/lib/apiClient";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";
import type { VerificationStatus } from "@/lib/verification";
import VerificationBadge from "@/components/VerificationBadge";
import styles from "@/styles/FactVerification.module.css";

type FactStatusMap = Record<string, VerificationStatus>;
type FactErrorMap = Record<string, string | null>;

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

type FactCardProps = {
  fact: FactWithAnnotations;
  status: VerificationStatus;
  error: string | null;
  onVerify: (fact: FactWithAnnotations) => void;
};

function VerificationFactCard({ fact, status, error, onVerify }: FactCardProps) {
  const isChecking = status === "checking";

  return (
    <article
      className={styles.factCard}
      aria-label={`Fact: ${fact.text}`}
    >
      <p className={styles.factCardText}>{fact.text}</p>
      <p className={styles.factCardContext}>{fact.context}</p>
      <p className={styles.factCardMeta}>{fact.documentName}</p>
      {error && (
        <p className={styles.factError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.factCardFooter}>
        <VerificationBadge status={status} />
        <button
          className={styles.verifyButton}
          onClick={() => onVerify(fact)}
          disabled={isChecking}
          aria-label={`Verify fact: ${fact.text}`}
        >
          {isChecking ? "Verifying…" : "Verify"}
        </button>
      </div>
    </article>
  );
}

type FactsGridContentProps = {
  facts: FactWithAnnotations[];
  statuses: FactStatusMap;
  errors: FactErrorMap;
  onVerify: (fact: FactWithAnnotations) => void;
};

function FactsGridContent({ facts, statuses, errors, onVerify }: FactsGridContentProps) {
  if (facts.length === 0) {
    return <FactsListPlaceholder />;
  }
  return (
    <>
      {facts.map((fact) => (
        <VerificationFactCard
          key={fact.id}
          fact={fact}
          status={statuses[fact.id] ?? "none"}
          error={errors[fact.id] ?? null}
          onVerify={onVerify}
        />
      ))}
    </>
  );
}

export default function FactVerificationPage() {
  const [facts, setFacts] = useState<FactWithAnnotations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [factStatuses, setFactStatuses] = useState<FactStatusMap>({});
  const [factErrors, setFactErrors] = useState<FactErrorMap>({});

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

  const setFactStatus = useCallback((id: string, status: VerificationStatus) => {
    setFactStatuses((prev) => ({ ...prev, [id]: status }));
  }, []);

  const setFactError = useCallback((id: string, message: string | null) => {
    setFactErrors((prev) => ({ ...prev, [id]: message }));
  }, []);

  const handleVerifyFact = useCallback(
    async (fact: FactWithAnnotations) => {
      setFactStatus(fact.id, "checking");
      setFactError(fact.id, null);
      try {
        const result = await verifyFact(fact.text);
        setFactStatus(fact.id, result.status as VerificationStatus);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Verification failed. Please try again.";
        setFactError(fact.id, message);
        setFactStatus(fact.id, "none");
      }
    },
    [setFactStatus, setFactError],
  );

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
          {!loading && !error && (
            <FactsGridContent
              facts={facts}
              statuses={factStatuses}
              errors={factErrors}
              onVerify={handleVerifyFact}
            />
          )}
        </div>
      </div>
    </>
  );
}
