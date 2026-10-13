import Link from "next/link";
import {
  Car,
  ChevronDown,
  Coffee,
  Dumbbell,
  PawPrint,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Star,
  Umbrella,
  UtensilsCrossed,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { SearchParams } from "@/lib/search";
import { AMENITIES } from "@/lib/validators";
import FilterPanel from "./FilterPanel";

const AMENITY_ICONS: Record<string, LucideIcon> = {
  WiFi: Wifi,
  Pool: WavesLadder,
  Parking: Car,
  Breakfast: Coffee,
  Gym: Dumbbell,
  Spa: Sparkles,
  "Air conditioning": Snowflake,
  "Pet friendly": PawPrint,
  Restaurant: UtensilsCrossed,
  "Beach access": Umbrella,
};

const STAR_OPTIONS = [
  { value: "", label: "Any" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const SORT_OPTIONS = [
  { value: "", label: "Top rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "stars", label: "Star rating" },
];

const SECTION_LABEL = "mb-3 block text-xs font-bold uppercase tracking-widest text-gray-400";
const FIELD =
  "w-full rounded-[10px] border border-transparent bg-gray-50 py-2.5 text-sm text-ink outline-none transition placeholder:text-gray-400 hover:bg-gray-100 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10";
const CHIP =
  "flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 peer-checked:border-brand peer-checked:bg-brand-50 peer-checked:text-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20";

export default function SearchFilters({ sp }: { sp: SearchParams }) {
  const selected = (sp.amenities ?? "").split(",").filter(Boolean);
  const activeCount =
    (sp.minPrice ? 1 : 0) + (sp.maxPrice ? 1 : 0) + (sp.stars ? 1 : 0) + selected.filter((a) => (AMENITIES as readonly string[]).includes(a)).length;
  const resetHref = `/search${sp.destination ? `?destination=${encodeURIComponent(sp.destination)}` : ""}`;

  return (
    <FilterPanel activeCount={activeCount}>
      <form action="/search" className="space-y-6 rounded-[14px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
        {(["destination", "checkIn", "checkOut", "guests"] as const).map((k) =>
          sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null,
        )}

        <div className="flex items-center justify-between">
          {/* On phones the toggle bar already says "Filters", so the title only shows from lg up. */}
          <h2 className="flex items-center gap-2 text-lg text-ink max-lg:hidden">
            <SlidersHorizontal size={18} className="text-brand" aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-brand px-2 py-0.5 font-sans text-xs font-bold normal-case text-white">{activeCount}</span>
            )}
          </h2>
          <Link href={resetHref} className="ml-auto text-sm font-semibold text-gray-500 underline-offset-4 transition hover:text-brand hover:underline">
            Reset
          </Link>
        </div>

        <div role="group" aria-labelledby="price-label" className="border-t border-gray-100 pt-5">
          <span id="price-label" className={SECTION_LABEL}>Price per night</span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">$</span>
              <input id="minPrice" name="minPrice" type="number" min={0} inputMode="numeric" placeholder="Min" aria-label="Minimum price" defaultValue={sp.minPrice} className={`${FIELD} pl-7 pr-2`} />
            </div>
            <span className="text-gray-300" aria-hidden="true">–</span>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">$</span>
              <input id="maxPrice" name="maxPrice" type="number" min={0} inputMode="numeric" placeholder="Max" aria-label="Maximum price" defaultValue={sp.maxPrice} className={`${FIELD} pl-7 pr-2`} />
            </div>
          </div>
        </div>

        <div role="radiogroup" aria-labelledby="stars-label" className="border-t border-gray-100 pt-5">
          <span id="stars-label" className={SECTION_LABEL}>Minimum stars</span>
          <div className="grid grid-cols-5 gap-1.5">
            {STAR_OPTIONS.map((o) => (
              <label key={o.value || "any"} className="relative">
                <input type="radio" name="stars" value={o.value} defaultChecked={(sp.stars ?? "") === o.value} className="peer sr-only" />
                <span className={`${CHIP} justify-center gap-1 px-1`}>
                  {o.label}
                  {o.value && <Star size={12} className="fill-current" aria-hidden="true" />}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div role="group" aria-labelledby="amenities-label" className="border-t border-gray-100 pt-5">
          <span id="amenities-label" className={SECTION_LABEL}>Amenities</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const Icon = AMENITY_ICONS[a];
              return (
                <label key={a} className="relative">
                  <input type="checkbox" name="amenities" value={a} defaultChecked={selected.includes(a)} className="peer sr-only" />
                  <span className={`${CHIP} px-3.5`}>
                    {Icon && <Icon size={15} aria-hidden="true" />}
                    {a}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label htmlFor="sort" className={SECTION_LABEL}>Sort by</label>
          <div className="relative">
            <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className={`${FIELD} cursor-pointer appearance-none px-3.5 pr-10`}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value || "top"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        <button className="btn w-full rounded-[10px] py-3 text-sm shadow-md shadow-brand/20 hover:-translate-y-px hover:shadow-lg">
          Apply filters
        </button>
      </form>
    </FilterPanel>
  );
}
