import type { ReactNode } from "react";
import Nav from "@/components/Nav";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
