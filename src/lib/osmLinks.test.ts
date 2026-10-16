import { describe, expect, it } from "vitest";
import { osmPlaceLink, osmPlaceLinkLabel } from "./osmLinks";

const hotel = { latitude: 7.2906, longitude: 80.6337 };
const place = { latitude: 7.2936, longitude: 80.6413 };

describe("osmPlaceLink", () => {
  it("opens directions with the hotel as A and the place as B", () => {
    const url = new URL(osmPlaceLink(place, hotel));
    expect(url.origin + url.pathname).toBe("https://www.openstreetmap.org/directions");
    expect(url.searchParams.get("route")).toBe("7.2906,80.6337;7.2936,80.6413");
    expect(url.searchParams.get("engine")).toBe("fossgis_osrm_foot");
  });
  it("encodes the separators so the link survives copy and paste", () => {
    expect(osmPlaceLink(place, hotel)).toContain("route=7.2906%2C80.6337%3B7.2936%2C80.6413");
  });
  it("uses the car engine for driving", () => {
    expect(new URL(osmPlaceLink(place, hotel, "drive")).searchParams.get("engine")).toBe("fossgis_osrm_car");
  });
  it("falls back to a single marker on the place when the hotel has no pin", () => {
    const url = osmPlaceLink(place, null);
    expect(url).toBe("https://www.openstreetmap.org/?mlat=7.2936&mlon=80.6413#map=18/7.2936/80.6413");
  });
  it("labels the link by what it shows", () => {
    expect(osmPlaceLinkLabel(hotel)).toMatch(/route from hotel/i);
    expect(osmPlaceLinkLabel(null)).toBe("Open in OpenStreetMap");
  });
});
