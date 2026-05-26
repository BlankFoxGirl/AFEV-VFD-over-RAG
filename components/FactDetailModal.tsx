"use client";

import { useEffect, useRef, useState } from "react";
import type { FactDetailResponse } from "@/pages/api/facts/verified-detail";
import styles from "@/styles/Chatbot.module.css";

type Props = {
  factText: string;
  onClose: () => void;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; detail: FactDetailResponse }
  | { status: "error"; message: string };

async function loadFactDetail(factText: string): Promise<FactDetailResponse> {
  const params = new URLSearchParams({ text: factText });
  const res = await fetch(`/api/facts/verified-detail?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to load fact detail");
  }
  return res.json() as Promise<FactDetailResponse>;
}

function useFactDetail(factText: string): FetchState {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    let cancelled = false;
    loadFactDetail(factText)
      .then((detail) => {
        if (!cancelled) setState({ status: "success", detail });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [factText]);

  return state;
}

function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className={styles.modalDetailRow}>
      <dt className={styles.modalDetailLabel}>{label}</dt>
      <dd className={styles.modalDetailValue}>{value}</dd>
    </div>
  );
}

function ModalContent({ detail }: { detail: FactDetailResponse }) {
  return (
    <dl className={styles.modalDetailList}>
      <DetailRow label="Matched Fact" value={detail.matchedFact} />
      <DetailRow label="Source" value={detail.source} />
      <DetailRow label="Category" value={detail.category} />
      <DetailRow label="Notes" value={detail.notes} />
    </dl>
  );
}

export default function FactDetailModal({ factText, onClose }: Props) {
  const state = useFactDetail(factText);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fact-detail-title"
        className={styles.modal}
      >
        <header className={styles.modalHeader}>
          <h2 id="fact-detail-title" className={styles.modalTitle}>
            Verification Detail
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.modalCloseButton}
            aria-label="Close verification detail"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className={styles.modalBody}>
          {state.status === "loading" && (
            <p className={styles.modalLoading} aria-live="polite">
              Loading…
            </p>
          )}
          {state.status === "error" && (
            <p className={styles.modalError} role="alert">
              {state.message}
            </p>
          )}
          {state.status === "success" && (
            <ModalContent detail={state.detail} />
          )}
        </div>
      </div>
    </>
  );
}
