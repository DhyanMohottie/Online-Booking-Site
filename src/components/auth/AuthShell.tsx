import { Building2, Clock, Search } from "lucide-react";
import Logo from "../Logo";

// Swap this URL (or point it at a file in /public) to change the side photo.
const AUTH_IMAGE = "https://picsum.photos/seed/stayfinder-auth/1200/1600";

const POINTS = [
  { icon: Search, text: "Search hotels with live availability" },
  { icon: Clock, text: "Book in minutes, cancel before check-in" },
  { icon: Building2, text: "List and manage your own hotels" },
];

type Props = {
  title: string;
  subtitle: string;
  sideTitle: string;
  sideText: string;
  children: React.ReactNode;
};

/** Two-column auth card: photo panel (large screens) + form panel. */
export default function AuthShell({ title, subtitle, sideTitle, sideText, children }: Props) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5 lg:grid-cols-[1fr_1.1fr]">
      <aside
        className="relative hidden flex-col justify-between bg-[#2b3340] bg-cover bg-center p-10 text-white lg:flex"
        style={{ backgroundImage: `linear-gradient(to top, rgba(10,14,22,0.88), rgba(10,14,22,0.35)), url(${AUTH_IMAGE})` }}
      >
        <Logo />
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl leading-tight">{sideTitle}</h2>
            <p className="max-w-sm text-base leading-relaxed text-white/80">{sideText}</p>
          </div>
          <ul className="space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-base text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <Icon size={18} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="min-w-0 p-6 sm:p-10 lg:p-12">
        <h1 className="text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-base text-gray-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </section>
    </div>
  );
}
