import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import HotelCard from "@/components/HotelCard";
import { EmptyState } from "@/components/ui";
import { searchHotels, type SearchParams } from "@/lib/search";
import { AMENITIES } from "@/lib/validators";
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
  const selected = (sp.amenities ?? "").split(",").filter(Boolean);

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
      <SearchBar destination={sp.destination} checkIn={sp.checkIn} checkOut={sp.checkOut} guests={sp.guests} />

      {datesGiven && !stay && (
        <p role="alert" className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Please choose valid dates (check-out after check-in, not in the past) to see live availability.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form className="card h-fit space-y-4 p-4" action="/search">
          {(["destination", "checkIn", "checkOut", "guests"] as const).map((k) =>
            sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null,
          )}
          <h2 className="font-bold">Filters</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="minPrice">Min $</label>
              <input id="minPrice" name="minPrice" type="number" min={0} defaultValue={sp.minPrice} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="maxPrice">Max $</label>
              <input id="maxPrice" name="maxPrice" type="number" min={0} defaultValue={sp.maxPrice} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="stars">Minimum stars</label>
            <select id="stars" name="stars" defaultValue={sp.stars ?? ""} className="input">
              <option value="">Any</option>
              {[2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>{s}+ stars</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Amenities</legend>
            <AmenityChecks selected={selected} />
          </fieldset>
          <div>
            <label className="label" htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="input">
              <option value="">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="stars">Star rating</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1">Apply</button>
            <Link href={`/search${sp.destination ? `?destination=${encodeURIComponent(sp.destination)}` : ""}`} className="btn-outline">Reset</Link>
          </div>
        </form>

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

function AmenityChecks({ selected }: { selected: string[] }) {
  // Submitted as repeated `amenities` params; normalize() joins them server-side.
  return (
    <div className="space-y-1">
      {AMENITIES.map((a) => (
        <label key={a} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="amenities" value={a} defaultChecked={selected.includes(a)} />
          {a}
        </label>
      ))}
    </div>
  );
}
