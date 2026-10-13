import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Logo from "./Logo";

const WRAP = "mx-auto max-w-page px-4 sm:px-6 lg:px-10";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/search", label: "Hotels" },
    ],
  },
  {
    title: "For hosts",
    links: [
      { href: "/register?role=OWNER", label: "List your property" },
      { href: "/login", label: "Owner sign in" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/register", label: "Register" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-gray-300">
      {/* flow-root keeps the banner's negative margin from collapsing past the footer edge */}
      <div className={`${WRAP} flow-root`}>
        <div className="relative -mt-14 overflow-hidden rounded-2xl bg-linear-to-r from-brand to-[#e2574f] px-8 py-10 text-white shadow-[0_20px_50px_rgba(200,49,43,0.35)] md:flex md:items-center md:justify-between md:gap-8 md:px-12">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl">Own a property?</h2>
            <p className="mt-2 max-w-xl text-base text-white/85">
              List it on StayFinder, manage rooms and bookings from one dashboard, and reach guests in minutes.
            </p>
          </div>
          <Link
            href="/register?role=OWNER"
            className="relative mt-6 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-brand shadow-md transition hover:-translate-y-px hover:bg-gray-50 hover:shadow-lg md:mt-0 md:shrink-0"
          >
            List your property <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              Search hotels, compare rooms and book with live availability. StayFinder is an educational demo project.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 text-lg text-white">{col.title}</h3>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-gray-400 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} StayFinder. All rights reserved.</p>
          <p>No real payments are processed and no card data is stored.</p>
        </div>
      </div>
    </footer>
  );
}
