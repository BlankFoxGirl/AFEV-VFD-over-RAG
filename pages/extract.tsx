import Head from "next/head";
import { useState } from "react";
import DocumentFactList from "@/components/DocumentFactList";
import styles from "@/styles/Extract.module.css";

type DocumentEntry = {
  id: string;
  name: string;
  content: string;
};

function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function DocumentForm({
  document,
  onDocumentChange,
}: {
  document: DocumentEntry;
  onDocumentChange: (doc: DocumentEntry) => void;
}) {
  return (
    <div className={styles.documentForm}>
      <label htmlFor="doc-name" className={styles.label}>
        Document Name
      </label>
      <input
        id="doc-name"
        className={styles.input}
        value={document.name}
        onChange={(e) => onDocumentChange({ ...document, name: e.target.value })}
        placeholder="Enter document name"
        aria-label="Document name"
      />
      <label htmlFor="doc-content" className={styles.label}>
        Document Content
      </label>
      <textarea
        id="doc-content"
        className={styles.textarea}
        value={document.content}
        onChange={(e) =>
          onDocumentChange({ ...document, content: e.target.value })
        }
        placeholder="Paste document content here..."
        rows={8}
        aria-label="Document content"
      />
    </div>
  );
}

export default function ExtractPage() {
  const [document, setDocument] = useState<DocumentEntry>({
    id: generateDocumentId(),
    name: "",
    content: "",
  });

  const isReadyToExtract = document.content.trim().length > 0;

  return (
    <>
      <Head>
        <title>FactCheck – Extract Facts</title>
        <meta
          name="description"
          content="Extract atomic facts and claims from your documents."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <h1 className={styles.title}>Extract Facts</h1>
        <p className={styles.description}>
          Paste a document below and extract atomic facts and claims.
        </p>
        <DocumentForm document={document} onDocumentChange={setDocument} />
        {isReadyToExtract && (
          <DocumentFactList
            documentId={document.id}
            documentName={document.name || "Untitled Document"}
            content={document.content}
          />
        )}
      </div>
    </>
  );
}
