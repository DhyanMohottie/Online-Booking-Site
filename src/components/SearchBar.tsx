import { ArrowRight, CalendarDays, MapPin, Users, type LucideIcon } from "lucide-react";
import { toDayString, todayUTC } from "@/lib/availability";

type Props = { destination?: string; checkIn?: string; checkOut?: string; guests?: string; hidden?: Record<string, string | undefined> };

const CELL =
  "group flex min-w-0 items-center gap-3 rounded-[10px] px-3 py-3 transition hover:bg-gray-50 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-brand/25 sm:px-4";
const LABEL = "block text-xs font-bold uppercase tracking-wider text-gray-500";
const CONTROL =
  "mt-0.5 w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-gray-400";

function Icon({ as: I }: { as: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand transition group-focus-within:bg-brand group-focus-within:text-white">
      <I size={20} aria-hidden="true" />
    </span>
  );
}

/** Plain GET form so search state lives in the URL (shareable, server-rendered). */
export default function SearchBar({ destination, checkIn, checkOut, guests, hidden }: Props) {
  const min = toDayString(todayUTC());
  return (
    <form
      action="/search"
      className="grid gap-1 rounded-[14px] bg-white p-2 text-left shadow-[0_16px_48px_rgba(0,0,0,0.28)] sm:grid-cols-2 lg:grid-cols-[1.5fr_1.3fr_1.3fr_0.75fr_auto] lg:items-stretch"
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className={CELL}>
        <Icon as={MapPin} />
        <span className="min-w-0 flex-1">
          <span className={LABEL}>Location</span>
          <input
            name="destination"
            defaultValue={destination}
            placeholder="City, country or hotel"
            className={CONTROL}
            aria-label="Destination"
          />
        </span>
      </label>
      <label className={CELL}>
        <Icon as={CalendarDays} />
        <span className="min-w-0 flex-1">
          <span className={LABEL}>Check in</span>
          <input type="date" name="checkIn" min={min} defaultValue={checkIn} className={CONTROL} aria-label="Check-in" required />
        </span>
      </label>
      <label className={CELL}>
        <Icon as={CalendarDays} />
        <span className="min-w-0 flex-1">
          <span className={LABEL}>Check out</span>
          <input type="date" name="checkOut" min={min} defaultValue={checkOut} className={CONTROL} aria-label="Check-out" required />
        </span>
      </label>
      <label className={CELL}>
        <Icon as={Users} />
        <span className="min-w-0 flex-1">
          <span className={LABEL}>Guests</span>
          <input type="number" name="guests" min={1} max={20} defaultValue={guests ?? "2"} className={CONTROL} aria-label="Guests" />
        </span>
      </label>
      <button className="btn min-h-16 rounded-[10px] px-10 text-base sm:col-span-2 lg:col-span-1 shadow-md shadow-brand/25 hover:shadow-lg">
        Search <ArrowRight size={18} aria-hidden="true" />
      </button>
    </form>
  );
}
