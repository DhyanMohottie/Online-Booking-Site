import { toDayString, todayUTC } from "@/lib/availability";

type Props = { destination?: string; checkIn?: string; checkOut?: string; guests?: string; hidden?: Record<string, string | undefined> };

/** Plain GET form so search state lives in the URL (shareable, server-rendered). */
export default function SearchBar({ destination, checkIn, checkOut, guests, hidden }: Props) {
  const min = toDayString(todayUTC());
  return (
    <form action="/search" className="grid gap-3 rounded-xl bg-accent p-3 shadow-lg md:grid-cols-[2fr_1fr_1fr_0.7fr_auto]">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input
        name="destination"
        defaultValue={destination}
        placeholder="Where are you going? (city, country or hotel)"
        className="input"
        aria-label="Destination"
      />
      <input type="date" name="checkIn" min={min} defaultValue={checkIn} className="input" aria-label="Check-in" required />
      <input type="date" name="checkOut" min={min} defaultValue={checkOut} className="input" aria-label="Check-out" required />
      <input type="number" name="guests" min={1} max={20} defaultValue={guests ?? "2"} className="input" aria-label="Guests" />
      <button className="btn px-6">Search</button>
    </form>
  );
}
