import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import RootLayout from "@/components/RootLayout";
import { FactsProvider } from "@/lib/contexts/FactsContext";

export const metadata: Metadata = {
  title: "FactCheck App",
  description: "Document fact extraction and verification platform",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FactsProvider>
          <RootLayout>{children}</RootLayout>
        </FactsProvider>
      </body>
    </html>
  );
}
