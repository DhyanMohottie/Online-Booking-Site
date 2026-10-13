import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import { searchHotels } from "@/lib/search";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [top, cities] = await Promise.all([
    searchHotels({ sort: "rating" }),
    prisma.hotel.groupBy({ by: ["city"], where: { status: "APPROVED" }, _count: { _all: true } }),
  ]);

  return (
    <div className="space-y-10">
      <section className="-mx-4 -mt-6 bg-brand px-4 pb-14 pt-10 text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold md:text-4xl">Find your next stay</h1>
            <p className="mt-2 text-white/80">Search hotels, compare rooms and book in minutes. Demo data, no real payments.</p>
          </div>
          <SearchBar />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Popular destinations</h2>
        <div className="flex flex-wrap gap-3">
          {cities.map((c) => (
            <Link
              key={c.city}
              href={`/search?destination=${encodeURIComponent(c.city)}`}
              className="card px-5 py-3 font-semibold hover:border-brand hover:text-brand"
            >
              {c.city} <span className="text-sm font-normal text-gray-500">· {c._count._all} stays</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Top rated stays</h2>
        <div className="space-y-4">
          {top.items.slice(0, 3).map((h) => (
            <HotelCard key={h.id} hotel={h} query="" />
          ))}
        </div>
        <Link href="/search" className="btn-outline mt-4">
          Browse all stays
        </Link>
      </section>
    </div>
  );
}
