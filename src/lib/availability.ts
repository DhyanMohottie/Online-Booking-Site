const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = { checkIn: Date; checkOut: Date };

/** Parse a YYYY-MM-DD string as UTC midnight. Returns null when invalid. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** Total in cents for the whole stay. */
export function calcTotal(pricePerNight: number, checkIn: Date, checkOut: Date): number {
  return pricePerNight * Math.max(0, nightsBetween(checkIn, checkOut));
}

/**
 * Two stays overlap when each starts before the other ends.
 * Same-day turnover (one checks out the day another checks in) is NOT an overlap.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
}

/** How many rooms of a type remain free across the whole requested range. */
export function roomsLeft(
  quantity: number,
  requested: DateRange,
  existing: (DateRange & { status: string })[],
): number {
  const taken = existing.filter((b) => b.status === "CONFIRMED" && rangesOverlap(requested, b)).length;
  return Math.max(0, quantity - taken);
}

export function isAvailable(
  quantity: number,
  requested: DateRange,
  existing: (DateRange & { status: string })[],
): boolean {
  return roomsLeft(quantity, requested, existing) > 0;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
