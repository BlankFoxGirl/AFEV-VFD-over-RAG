import Head from "next/head";
import { useEffect, useState } from "react";
import { FactsProvider, useFacts } from "@/lib/contexts/FactsContext";
import type { FactWithAnnotations } from "@/lib/contexts/FactsContext";
import FactAnnotation from "@/components/FactAnnotation";
import styles from "@/styles/Facts.module.css";

function FactCard({
  fact,
  isSelected,
  onSelect,
  onDelete,
}: {
  fact: FactWithAnnotations;
  isSelected: boolean;
  onSelect: (fact: FactWithAnnotations) => void;
  onDelete: (fact: FactWithAnnotations) => void;
}) {
  return (
    <li>
      <div
        className={`${styles.factCard} ${isSelected ? styles.selected : ""}`}
        onClick={() => onSelect(fact)}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`Select fact: ${fact.text}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(fact);
        }}
      >
        <p className={styles.factCardText}>{fact.text}</p>
        <p className={styles.factCardMeta}>{fact.documentName}</p>
        <div className={styles.factCardFooter}>
          <p className={styles.annotationCount}>
            {fact.annotations.length} annotation
            {fact.annotations.length !== 1 ? "s" : ""}
          </p>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(fact);
            }}
            aria-label={`Delete fact: ${fact.text}`}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function FactsSidebar({
  facts,
  selectedFactId,
  onSelect,
  onDelete,
}: {
  facts: FactWithAnnotations[];
  selectedFactId: string | null;
  onSelect: (fact: FactWithAnnotations) => void;
  onDelete: (fact: FactWithAnnotations) => void;
}) {
  if (facts.length === 0) {
    return (
      <p className={styles.emptyState}>
        No facts found. Extract facts from the Extract page first.
      </p>
    );
  }

  return (
    <ul className={styles.factsList} aria-label="Facts list">
      {facts.map((fact) => (
        <FactCard
          key={fact.id}
          fact={fact}
          isSelected={selectedFactId === fact.id}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function FactsContent() {
  const { state, loadFacts, updateFact, deleteFact } = useFacts();
  const [selectedFact, setSelectedFact] = useState<FactWithAnnotations | null>(
    null,
  );

  useEffect(() => {
    void loadFacts();
  }, []);

  function handleFactSelect(fact: FactWithAnnotations) {
    setSelectedFact(fact);
  }

  function handleAnnotationSaved(updatedFact: FactWithAnnotations) {
    updateFact(updatedFact);
    setSelectedFact(updatedFact);
  }

  async function handleFactDelete(fact: FactWithAnnotations) {
    if (!window.confirm(`Delete this fact?\n\n"${fact.text}"`)) return;
    await deleteFact(fact.id);
    if (selectedFact?.id === fact.id) {
      setSelectedFact(null);
    }
  }

  const currentSelectedFact = selectedFact
    ? (state.facts.find((f) => f.id === selectedFact.id) ?? selectedFact)
    : null;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarHeading}>
          Facts ({state.facts.length})
        </h2>
        {state.loading && (
          <div className={styles.statusContainer} role="status">
            <span className={styles.loadingText}>Loading facts…</span>
          </div>
        )}
        {state.error && (
          <div className={styles.statusContainer} role="alert">
            <span className={styles.errorText}>{state.error}</span>
          </div>
        )}
        {!state.loading && !state.error && (
          <FactsSidebar
            facts={state.facts}
            selectedFactId={currentSelectedFact?.id ?? null}
            onSelect={handleFactSelect}
            onDelete={handleFactDelete}
          />
        )}
      </aside>
      <div>
        {currentSelectedFact ? (
          <FactAnnotation
            key={currentSelectedFact.id}
            fact={currentSelectedFact}
            onAnnotationSaved={handleAnnotationSaved}
          />
        ) : (
          <div className={styles.panelPlaceholder}>
            Select a fact from the list to view and annotate it.
          </div>
        )}
      </div>
    </div>
  );
}

export default function FactsPage() {
  return (
    <FactsProvider>
      <Head>
        <title>FactCheck – Facts</title>
        <meta
          name="description"
          content="Browse, edit, and annotate extracted facts."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <h1 className={styles.title}>Facts</h1>
        <p className={styles.description}>
          Browse extracted facts, edit their text, and add annotations.
        </p>
        <FactsContent />
      </div>
    </FactsProvider>
  );
}
