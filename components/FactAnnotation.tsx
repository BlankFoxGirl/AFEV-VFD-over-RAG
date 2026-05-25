"use client";

import { useState } from "react";
import type { FactWithAnnotations, Annotation } from "@/lib/contexts/FactsContext";
import styles from "@/styles/FactAnnotation.module.css";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type FactAnnotationProps = {
  fact: FactWithAnnotations;
  onAnnotationSaved: (updatedFact: FactWithAnnotations) => void;
};

async function postAnnotation(
  factId: string,
  annotationText: string,
  editedFactText: string,
): Promise<FactWithAnnotations> {
  const body: Record<string, string> = { annotationText };
  if (editedFactText) body.editedFactText = editedFactText;

  const response = await fetch(`/api/facts/${factId}/annotate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to save annotation");
  }

  return response.json() as Promise<FactWithAnnotations>;
}

function AnnotationEntry({ annotation }: { annotation: Annotation }) {
  return (
    <li className={styles.annotationEntry}>
      <p className={styles.annotationText}>{annotation.text}</p>
      {annotation.editedFactText && (
        <p className={styles.annotationEditedText}>
          Edited: {annotation.editedFactText}
        </p>
      )}
      <time className={styles.annotationTime} dateTime={annotation.createdAt}>
        {new Date(annotation.createdAt).toLocaleString()}
      </time>
    </li>
  );
}

function AnnotationsList({ annotations }: { annotations: Annotation[] }) {
  if (annotations.length === 0) {
    return (
      <p className={styles.noAnnotations}>No annotations yet.</p>
    );
  }
  return (
    <ul className={styles.annotationsList} aria-label="Annotations">
      {annotations.map((a, i) => (
        <AnnotationEntry key={`${a.createdAt}-${i}`} annotation={a} />
      ))}
    </ul>
  );
}

function SaveStatusMessage({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span role="status" className={styles.statusSaving}>
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span role="status" className={styles.statusSaved}>
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span role="alert" className={styles.statusError}>
        Failed to save
      </span>
    );
  }
  return null;
}

export default function FactAnnotation({
  fact,
  onAnnotationSaved,
}: FactAnnotationProps) {
  const [editedText, setEditedText] = useState(fact.text);
  const [annotationInput, setAnnotationInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function handleSave() {
    if (!annotationInput.trim()) return;
    setSaveStatus("saving");
    try {
      const updated = await postAnnotation(fact.id, annotationInput, editedText !== fact.text ? editedText : "");
      onAnnotationSaved(updated);
      setAnnotationInput("");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <div
      role="region"
      className={styles.container}
      aria-label="Fact annotation panel"
    >
      <section className={styles.factSection}>
        <h3 className={styles.sectionHeading}>Fact</h3>
        <textarea
          className={styles.factTextarea}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={4}
          aria-label="Edit fact text"
        />
        <p className={styles.contextLabel}>Context</p>
        <p className={styles.contextText}>{fact.context}</p>
      </section>

      <section className={styles.annotationsSection}>
        <h3 className={styles.sectionHeading}>
          Annotations ({fact.annotations.length})
        </h3>
        <AnnotationsList annotations={fact.annotations} />
      </section>

      <section className={styles.addAnnotationSection}>
        <h3 className={styles.sectionHeading}>Add Annotation</h3>
        <textarea
          className={styles.annotationInput}
          value={annotationInput}
          onChange={(e) => setAnnotationInput(e.target.value)}
          placeholder="Enter annotation note…"
          rows={3}
          aria-label="Annotation text"
        />
        <div className={styles.saveRow}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saveStatus === "saving" || !annotationInput.trim()}
            aria-label="Save annotation"
          >
            {saveStatus === "saving" ? "Saving…" : "Save Annotation"}
          </button>
          <SaveStatusMessage status={saveStatus} />
        </div>
      </section>
    </div>
  );
}
