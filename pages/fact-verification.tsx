import Head from "next/head";
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

export default function FactVerificationPage() {
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
          <FactsListPlaceholder />
        </div>
      </div>
    </>
  );
}
