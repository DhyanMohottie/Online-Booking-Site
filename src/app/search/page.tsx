import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import SearchFilters from "@/components/SearchFilters";
import { EmptyState } from "@/components/ui";
import { searchHotels, type SearchParams } from "@/lib/search";
import { toDayString } from "@/lib/availability";

export const metadata = { title: "Search stays - StayFinder" };

type RawParams = Record<string, string | string[] | undefined>;

/** Repeated checkbox params arrive as arrays; collapse everything to single strings. */
function normalize(raw: RawParams): SearchParams {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? (k === "amenities" ? v.join(",") : v[0]) : v;
  }
  return out;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = normalize(await searchParams);
  const { items, total, page, pages, stay, guests } = await searchHotels(sp);
  const datesGiven = Boolean(sp.checkIn || sp.checkOut);

  // Carry dates/guests into hotel pages so availability stays consistent.
  const stayQuery = stay
    ? `?checkIn=${toDayString(stay.checkIn)}&checkOut=${toDayString(stay.checkOut)}&guests=${guests}`
    : "";

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v);
    q.set("page", String(p));
    return `/search?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="bleed -mt-8 bg-ink py-8">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="mb-4 text-2xl text-white">Find your stay</h1>
          <SearchBar destination={sp.destination} checkIn={sp.checkIn} checkOut={sp.checkOut} guests={sp.guests} />
        </div>
      </div>

      {datesGiven && !stay && (
        <p role="alert" className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Please choose valid dates (check-out after check-in, not in the past) to see live availability.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[288px_1fr]">
        <SearchFilters sp={sp} />

        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            {total} stay{total === 1 ? "" : "s"} found{sp.destination ? ` for "${sp.destination}"` : ""}
            {stay ? ` · ${toDayString(stay.checkIn)} to ${toDayString(stay.checkOut)}` : ""}
          </p>
          {items.length === 0 ? (
            <EmptyState title="No stays match your search" hint="Try different dates, a wider price range or fewer filters." href="/search" cta="Clear search" />
          ) : (
            items.map((h) => <HotelCard key={h.id} hotel={h} query={stayQuery} />)
          )}
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pagination">
              {page > 1 && <Link href={pageHref(page - 1)} className="btn-outline">Previous</Link>}
              <span className="text-sm text-gray-600">Page {page} of {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className="btn-outline">Next</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
