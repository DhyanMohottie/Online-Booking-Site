import { ArrowRight } from "lucide-react";
import { toDayString, todayUTC } from "@/lib/availability";

type Props = { destination?: string; checkIn?: string; checkOut?: string; guests?: string; hidden?: Record<string, string | undefined> };

const FIELD = "flex flex-col justify-center border-gray-200 px-4 py-2 md:border-r";
const LABEL = "text-xs font-bold uppercase tracking-wider text-brand";
const CONTROL = "w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-gray-400";

/** Plain GET form so search state lives in the URL (shareable, server-rendered). */
export default function SearchBar({ destination, checkIn, checkOut, guests, hidden }: Props) {
  const min = toDayString(todayUTC());
  return (
    <form
      action="/search"
      className="grid divide-y divide-gray-100 rounded-sm bg-white shadow-xl md:grid-cols-[2fr_1.2fr_1.2fr_0.8fr_auto] md:divide-y-0"
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className={FIELD}>
        <span className={LABEL}>Location</span>
        <input
          name="destination"
          defaultValue={destination}
          placeholder="City, country or hotel"
          className={CONTROL}
          aria-label="Destination"
        />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Check in</span>
        <input type="date" name="checkIn" min={min} defaultValue={checkIn} className={CONTROL} aria-label="Check-in" required />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Check out</span>
        <input type="date" name="checkOut" min={min} defaultValue={checkOut} className={CONTROL} aria-label="Check-out" required />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Guests</span>
        <input type="number" name="guests" min={1} max={20} defaultValue={guests ?? "2"} className={CONTROL} aria-label="Guests" />
      </label>
      <button className="btn min-h-14 rounded-none px-8 text-sm md:rounded-r-sm">
        Search <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
