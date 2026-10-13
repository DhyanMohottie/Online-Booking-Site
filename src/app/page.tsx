import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, MapPin } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { HotelTile } from "@/components/HotelCard";
import { SectionTitle, StatsBar } from "@/components/ui";
import { searchHotels } from "@/lib/search";
import { prisma } from "@/lib/prisma";

// Swap this URL (or point it at a file in /public) to change the hero photo.
const HERO_IMAGE = "https://picsum.photos/seed/stayfinder-hero/1920/900";

// Same width/gutters as the header and the Hotels page, so every section lines up.
const WRAP = "mx-auto max-w-page px-4 sm:px-6 lg:px-10";

const STEPS = [
  { icon: CalendarDays, title: "Select days", subtitle: "Check in & check out", text: "Choose your destination, dates and number of guests." },
  { icon: MapPin, title: "Find hotels", subtitle: "Near your destination", text: "Compare rooms, prices and guest reviews with live availability." },
  { icon: Briefcase, title: "Pick a hotel", subtitle: "And enjoy your trip", text: "Reserve in minutes and manage your booking from your dashboard." },
];

type Destination = { city: string; country: string; count: number; image: string | null };

export default async function Home() {
  const [top, approved, users, reviews, bookings] = await Promise.all([
    searchHotels({ sort: "rating" }),
    prisma.hotel.findMany({
      where: { status: "APPROVED" },
      select: { city: true, country: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
    }),
    prisma.user.count(),
    prisma.review.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
  ]);

  // One card per city, using the first photo of its first hotel.
  const byCity = new Map<string, Destination>();
  for (const h of approved) {
    const d = byCity.get(h.city);
    if (d) d.count += 1;
    else byCity.set(h.city, { city: h.city, country: h.country, count: 1, image: h.images[0]?.url ?? null });
  }
  const destinations = [...byCity.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  return (
    <div className="-mt-8">
      {/* Hero */}
      <section className="bleed bg-[#2b3340]">
        <div
          className="bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(rgba(10,14,22,0.55), rgba(10,14,22,0.55)), url(${HERO_IMAGE})` }}
        >
          <div className={`${WRAP} pb-32 pt-56 text-white md:pt-40`}>
            <h1 className="text-center text-3xl leading-tight md:text-5xl">
              Find unique places to stay
              <br />
              in {destinations.length} destinations
            </h1>
            <div className="mt-10">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Stats overlapping the hero */}
      <div className="relative z-10 -mt-14">
        <StatsBar
          items={[
            { value: users.toLocaleString("en-US"), label: "Users" },
            { value: reviews.toLocaleString("en-US"), label: "Rating & review" },
            { value: approved.length.toLocaleString("en-US"), label: "Hotels" },
            { value: bookings.toLocaleString("en-US"), label: "Bookings" },
          ]}
        />
      </div>

      {/* How it works */}
      <section className="py-20">
        <SectionTitle title="See how it works" subtitle="Discover how StayFinder helps you find everything you want." />
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, subtitle, text }) => (
            <div key={title} className="card flex flex-col items-center px-8 py-12 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand">
                <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-xl leading-snug text-ink">
                {title}
                <br />
                {subtitle}
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top hotels */}
      <section className="bleed bg-white py-20">
        <div className={WRAP}>
          <SectionTitle title="Top hotels maybe you will like" subtitle="Here are some hotels with great reputations." />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {top.items.slice(0, 6).map((h) => (
              <HotelTile key={h.id} hotel={h} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/search" className="btn px-8 py-3 text-sm">
              View all hotels <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Popular destinations */}
      <section className="py-20">
        <SectionTitle title="Popular destinations" subtitle="Explore the cities our guests book most." />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {destinations.slice(0, 8).map((d) => (
            <Link
              key={d.city}
              href={`/search?destination=${encodeURIComponent(d.city)}`}
              className="group relative block aspect-4/3 overflow-hidden rounded-xl bg-linear-to-br from-[#2b3340] to-[#556070] shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.18)]"
            >
              {/* Background image (not <img>) so a broken photo URL falls back to the gradient quietly. */}
              {d.image && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${JSON.stringify(d.image)})` }}
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-ink backdrop-blur">
                {d.count} {d.count === 1 ? "stay" : "stays"}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-2xl">{d.city}</h3>
                  <p className="truncate text-sm text-white/80">{d.country}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition duration-300 group-hover:translate-x-1 group-hover:bg-brand">
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
