"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Transparent overlay on the home page (sits over the hero), solid dark bar elsewhere. */
export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const overlay = usePathname() === "/";
  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 to-transparent text-white"
          : "relative z-30 bg-ink text-white"
      }
    >
      {children}
    </header>
  );
}

export function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);
  return (
    <Link
      href={href}
      className={`text-xs font-semibold uppercase tracking-wider transition hover:text-brand ${active ? "text-brand" : "text-white"} ${className}`}
    >
      {children}
    </Link>
  );
}
