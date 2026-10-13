import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, MapPin } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { HotelTile } from "@/components/HotelCard";
import { SectionTitle, StatsBar } from "@/components/ui";
import { searchHotels } from "@/lib/search";
import { prisma } from "@/lib/prisma";

// Swap this URL (or point it at a file in /public) to change the hero photo.
const HERO_IMAGE = "https://picsum.photos/seed/stayfinder-hero/1920/900";

const STEPS = [
  { icon: CalendarDays, title: "Select days", subtitle: "Check in & check out", text: "Choose your destination, dates and number of guests." },
  { icon: MapPin, title: "Find hotels", subtitle: "Near your destination", text: "Compare rooms, prices and guest reviews with live availability." },
  { icon: Briefcase, title: "Pick a hotel", subtitle: "And enjoy your trip", text: "Reserve in minutes and manage your booking from your dashboard." },
];

export default async function Home() {
  const [top, cities, users, reviews, hotels, bookings] = await Promise.all([
    searchHotels({ sort: "rating" }),
    prisma.hotel.groupBy({ by: ["city"], where: { status: "APPROVED" }, _count: { _all: true } }),
    prisma.user.count(),
    prisma.review.count(),
    prisma.hotel.count({ where: { status: "APPROVED" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
  ]);

  return (
    <div className="-mt-8">
      {/* Hero */}
      <section className="bleed bg-[#2b3340]">
        <div
          className="bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(rgba(10,14,22,0.55), rgba(10,14,22,0.55)), url(${HERO_IMAGE})` }}
        >
          <div className="mx-auto max-w-6xl px-4 pb-32 pt-56 text-center md:pt-40 text-white">
            <h1 className="text-3xl leading-tight md:text-5xl">
              Find unique places to stay
              <br />
              in {cities.length} destinations
            </h1>
            <div className="mt-10 text-left">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Stats overlapping the hero */}
      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4">
        <StatsBar
          items={[
            { value: users.toLocaleString("en-US"), label: "Users" },
            { value: reviews.toLocaleString("en-US"), label: "Rating & review" },
            { value: hotels.toLocaleString("en-US"), label: "Hotels" },
            { value: bookings.toLocaleString("en-US"), label: "Bookings" },
          ]}
        />
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-4xl py-16">
        <SectionTitle title="See how it works" subtitle="Discover how StayFinder helps you find everything you want." />
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, subtitle, text }) => (
            <div key={title} className="card flex flex-col items-center px-6 py-10 text-center">
              <Icon size={56} strokeWidth={1.25} className="text-brand" aria-hidden="true" />
              <h3 className="mt-6 text-base leading-snug text-ink">
                {title}
                <br />
                {subtitle}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top hotels */}
      <section className="bleed bg-white py-16">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <SectionTitle title="Top hotels maybe you will like" subtitle="Here are some hotels with great reputations." />
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {top.items.slice(0, 4).map((h) => (
              <HotelTile key={h.id} hotel={h} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/search" className="btn px-8 py-3">
              View all hotels <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Popular destinations */}
      <section className="mx-auto max-w-4xl py-16">
        <SectionTitle title="Popular destinations" />
        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((c) => (
            <Link
              key={c.city}
              href={`/search?destination=${encodeURIComponent(c.city)}`}
              className="card px-5 py-3 text-sm font-semibold text-ink transition hover:text-brand"
            >
              {c.city} <span className="font-normal text-gray-500">· {c._count._all} {c._count._all === 1 ? "stay" : "stays"}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
