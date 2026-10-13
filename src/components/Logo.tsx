import Link from "next/link";

export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="StayFinder home">
      <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2 4 12v16h9v-9h6v9h9V12L16 2Z" fill="#c8312b" />
        <path d="M16 2 4 12h24L16 2Z" fill="#f5b301" />
      </svg>
      <span className={`font-[family-name:var(--font-oswald)] text-3xl font-semibold uppercase leading-none ${dark ? "text-ink" : "text-white"}`}>
        Stay<span className="text-brand">Finder</span>
      </span>
    </Link>
  );
}
