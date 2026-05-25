import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import RootLayout from "@/components/RootLayout";

export const metadata: Metadata = {
  title: "FactCheck App",
  description: "Document fact extraction and verification platform",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootLayout>{children}</RootLayout>
      </body>
    </html>
  );
}
