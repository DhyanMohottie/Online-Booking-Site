import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance } from "./geo";

const louvre = { latitude: 48.8606, longitude: 2.3376 };
const eiffel = { latitude: 48.8584, longitude: 2.2945 };

describe("distanceKm", () => {
  it("is zero for the same point and symmetric", () => {
    expect(distanceKm(louvre, louvre)).toBe(0);
    expect(distanceKm(louvre, eiffel)).toBeCloseTo(distanceKm(eiffel, louvre), 9);
  });
  it("matches a known distance (Louvre to Eiffel Tower is about 3.2 km)", () => {
    expect(distanceKm(louvre, eiffel)).toBeGreaterThan(3.1);
    expect(distanceKm(louvre, eiffel)).toBeLessThan(3.3);
  });
  it("handles long distances (Paris to New York is about 5,840 km)", () => {
    const d = distanceKm(louvre, { latitude: 40.7128, longitude: -74.006 });
    expect(d).toBeGreaterThan(5800);
    expect(d).toBeLessThan(5900);
  });
  it("handles the antimeridian and the poles", () => {
    expect(distanceKm({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 })).toBeLessThan(25);
    expect(distanceKm({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 })).toBeCloseTo(20015, -1);
  });
});

describe("formatDistance", () => {
  it("uses metres under a kilometre, rounded to 10 m", () => {
    expect(formatDistance(0.453)).toBe("450 m");
    expect(formatDistance(0.004)).toBe("10 m");
  });
  it("uses one decimal up to 10 km and whole km beyond", () => {
    expect(formatDistance(1.234)).toBe("1.2 km");
    expect(formatDistance(9.96)).toBe("10.0 km");
    expect(formatDistance(27.4)).toBe("27 km");
  });
  it("returns an empty string for invalid input", () => {
    expect(formatDistance(NaN)).toBe("");
    expect(formatDistance(-1)).toBe("");
  });
});
