import { describe, expect, it } from "vitest";
import { hotelSchema } from "./validators";

const base = {
  name: "Test Hotel",
  description: "A hotel used for validator tests.",
  city: "Paris",
  country: "France",
  address: "1 Rue Test",
  starRating: 4,
};

describe("hotelSchema location", () => {
  it("accepts a hotel with no location (empty, null or missing)", () => {
    expect(hotelSchema.safeParse(base).success).toBe(true);
    expect(hotelSchema.safeParse({ ...base, latitude: "", longitude: "" }).success).toBe(true);
    expect(hotelSchema.safeParse({ ...base, latitude: null, longitude: null }).success).toBe(true);
  });

  it("accepts a valid pair and coerces numeric strings", () => {
    const r = hotelSchema.safeParse({ ...base, latitude: "48.8606", longitude: 2.3376 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.latitude).toBeCloseTo(48.8606);
      expect(r.data.longitude).toBeCloseTo(2.3376);
    }
  });

  it("accepts the extremes and the equator/prime meridian (zero is a real value)", () => {
    expect(hotelSchema.safeParse({ ...base, latitude: 90, longitude: -180 }).success).toBe(true);
    const zero = hotelSchema.safeParse({ ...base, latitude: 0, longitude: 0 });
    expect(zero.success).toBe(true);
    if (zero.success) expect(zero.data.latitude).toBe(0);
  });

  it("requires both coordinates or neither", () => {
    const r = hotelSchema.safeParse({ ...base, latitude: 48.8, longitude: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/both latitude and longitude/i);
    expect(hotelSchema.safeParse({ ...base, longitude: 2.3 }).success).toBe(false);
  });

  it("rejects out-of-range or non-numeric values", () => {
    expect(hotelSchema.safeParse({ ...base, latitude: 95, longitude: 2 }).success).toBe(false);
    expect(hotelSchema.safeParse({ ...base, latitude: 10, longitude: 181 }).success).toBe(false);
    expect(hotelSchema.safeParse({ ...base, latitude: "abc", longitude: 2 }).success).toBe(false);
  });
});
