"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/styles/Nav.module.css";

const NAV_LINKS = [
  { href: "/upload", label: "Upload" },
  { href: "/extract", label: "Extract" },
  { href: "/facts", label: "Facts" },
  { href: "/verify", label: "Verify" },
  { href: "/fact-verification", label: "Fact Verification" },
  { href: "/", label: "Chatbot" },
] as const;

function NavLinks({
  isOpen,
  onLinkClick,
}: {
  isOpen: boolean;
  onLinkClick: () => void;
}) {
  return (
    <ul className={`${styles.links} ${isOpen ? styles.open : ""}`}>
      {NAV_LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} className={styles.link} onClick={onLinkClick}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MenuToggleButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={styles.menuButton}
      onClick={onToggle}
      aria-label="Toggle navigation menu"
      aria-expanded={isOpen}
    >
      {isOpen ? "✕" : "☰"}
    </button>
  );
}

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/" className={styles.brand}>
        FactCheck
      </Link>
      <MenuToggleButton isOpen={isOpen} onToggle={toggleMenu} />
      <NavLinks isOpen={isOpen} onLinkClick={closeMenu} />
    </nav>
  );
}
