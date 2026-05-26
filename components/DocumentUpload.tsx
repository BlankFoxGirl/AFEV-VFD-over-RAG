"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { uploadDocument } from "@/lib/apiClient";
import styles from "@/styles/DocumentUpload.module.css";

type UploadStatus =
  | { type: "idle" }
  | { type: "reading" }
  | { type: "uploading"; fileName: string }
  | { type: "success"; fileName: string; factCount: number }
  | { type: "error"; message: string };

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function UploadStatusMessage({ status }: { status: UploadStatus }) {
  if (status.type === "idle") return null;
  if (status.type === "reading") {
    return (
      <span className={styles.statusReading} role="status" aria-live="polite">
        Reading file…
      </span>
    );
  }
  if (status.type === "uploading") {
    return (
      <span className={styles.statusUploading} role="status" aria-live="polite">
        Uploading {status.fileName}…
      </span>
    );
  }
  if (status.type === "success") {
    return (
      <span className={styles.statusSuccess} role="status" aria-live="polite">
        ✓ {status.factCount} fact{status.factCount !== 1 ? "s" : ""} extracted
        from {status.fileName}
      </span>
    );
  }
  return (
    <span className={styles.statusError} role="alert" aria-live="assertive">
      {status.message}
    </span>
  );
}

export default function DocumentUpload() {
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileDialog = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    try {
      setStatus({ type: "reading" });
      const content = await readFileAsText(file);

      setStatus({ type: "uploading", fileName: file.name });
      const result = await uploadDocument(file.name, content);

      setStatus({
        type: "success",
        fileName: result.documentName,
        factCount: result.factCount,
      });
    } catch {
      setStatus({ type: "error", message: "Upload failed. Please try again." });
    }
  };

  const isProcessing =
    status.type === "reading" || status.type === "uploading";

  return (
    <div className={styles.wrapper}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.csv"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        aria-label="Select document to upload"
        data-testid="file-input"
      />
      <button
        type="button"
        className={styles.attachButton}
        onClick={triggerFileDialog}
        disabled={isProcessing}
        aria-label="Attach document"
        title="Upload a document for fact extraction"
      >
        📎
      </button>
      <UploadStatusMessage status={status} />
    </div>
  );
}
