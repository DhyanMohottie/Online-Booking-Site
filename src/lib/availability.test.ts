import { describe, expect, it } from "vitest";
import { calcTotal, isAvailable, nightsBetween, parseDay, rangesOverlap, roomsLeft } from "./availability";

const d = (s: string) => parseDay(s)!;
const range = (a: string, b: string) => ({ checkIn: d(a), checkOut: d(b) });
const booking = (a: string, b: string, status = "CONFIRMED") => ({ ...range(a, b), status });

describe("parseDay", () => {
  it("parses valid dates and rejects garbage", () => {
    expect(parseDay("2026-03-05")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseDay("nope")).toBeNull();
    expect(parseDay("2026-13-40")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });
});

describe("rangesOverlap", () => {
  it("allows same-day turnover", () => {
    expect(rangesOverlap(range("2026-03-05", "2026-03-08"), range("2026-03-08", "2026-03-10"))).toBe(false);
    expect(rangesOverlap(range("2026-03-01", "2026-03-05"), range("2026-03-05", "2026-03-08"))).toBe(false);
  });
  it("detects partial overlap", () => {
    expect(rangesOverlap(range("2026-03-05", "2026-03-08"), range("2026-03-07", "2026-03-10"))).toBe(true);
    expect(rangesOverlap(range("2026-03-07", "2026-03-10"), range("2026-03-05", "2026-03-08"))).toBe(true);
  });
  it("detects containment both ways", () => {
    expect(rangesOverlap(range("2026-03-01", "2026-03-31"), range("2026-03-10", "2026-03-12"))).toBe(true);
    expect(rangesOverlap(range("2026-03-10", "2026-03-12"), range("2026-03-01", "2026-03-31"))).toBe(true);
  });
});

describe("availability", () => {
  const req = range("2026-03-05", "2026-03-08");

  it("is available when there are no bookings", () => {
    expect(isAvailable(1, req, [])).toBe(true);
  });
  it("is unavailable when a single room is taken", () => {
    expect(isAvailable(1, req, [booking("2026-03-06", "2026-03-07")])).toBe(false);
  });
  it("counts remaining inventory for quantity > 1", () => {
    const existing = [booking("2026-03-04", "2026-03-06"), booking("2026-03-07", "2026-03-09")];
    expect(roomsLeft(3, req, existing)).toBe(1);
    expect(isAvailable(2, req, existing)).toBe(false);
  });
  it("ignores cancelled bookings", () => {
    expect(isAvailable(1, req, [booking("2026-03-05", "2026-03-08", "CANCELLED")])).toBe(true);
  });
  it("ignores bookings that only touch the boundary", () => {
    expect(isAvailable(1, req, [booking("2026-03-01", "2026-03-05"), booking("2026-03-08", "2026-03-10")])).toBe(true);
  });
});

describe("pricing", () => {
  it("counts nights and totals", () => {
    expect(nightsBetween(d("2026-03-05"), d("2026-03-08"))).toBe(3);
    expect(calcTotal(12000, d("2026-03-05"), d("2026-03-08"))).toBe(36000);
  });
  it("never returns a negative total", () => {
    expect(calcTotal(12000, d("2026-03-08"), d("2026-03-05"))).toBe(0);
  });
});
