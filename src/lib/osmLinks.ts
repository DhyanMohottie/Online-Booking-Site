import type { Profile } from "./routing/types";

type Point = { latitude: number; longitude: number };

const ENGINE: Record<Profile, string> = { walk: "fossgis_osrm_foot", drive: "fossgis_osrm_car" };

/**
 * Link that opens a nearby place on openstreetmap.org. With a hotel pin it opens OpenStreetMap's directions
 * page, which shows the hotel (A) and the place (B) together with the route and its distance; without one it
 * falls back to a single marker on the place.
 */
export function osmPlaceLink(place: Point, hotel: Point | null, mode: Profile = "walk"): string {
  if (!hotel) {
    return `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`;
  }
  const route = `${hotel.latitude},${hotel.longitude};${place.latitude},${place.longitude}`;
  return `https://www.openstreetmap.org/directions?engine=${ENGINE[mode]}&route=${encodeURIComponent(route)}`;
}

/** Link text: says what the page will show. */
export function osmPlaceLinkLabel(hotel: Point | null): string {
  return hotel ? "View route from hotel on OpenStreetMap" : "Open in OpenStreetMap";
}
