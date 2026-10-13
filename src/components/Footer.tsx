import Link from "next/link";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Hotels" },
  { href: "/register", label: "Register" },
  { href: "/login", label: "Sign in" },
  { href: "/register?role=OWNER", label: "List your property" },
];

export default function Footer() {
  return (
    <footer className="mt-10 bg-white">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:px-6 lg:px-10 md:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <Logo dark />
          <p className="text-xs leading-relaxed text-gray-500">
            &copy; {new Date().getFullYear()} StayFinder. An educational demo project.
            <br />
            No real payments are processed and no card data is stored.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
            {LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
