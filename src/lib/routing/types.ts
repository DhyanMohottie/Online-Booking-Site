/** Shared types for the road-routing engine (OpenStreetMap graph + A* / Dijkstra). */

export type Profile = "walk" | "drive";
export type LatLng = { lat: number; lng: number };
/** [lat, lng] pair as stored in route polylines. */
export type Pt = [number, number];

// --- minimal Overpass / OSM JSON shapes we read ---
export type OsmNode = { type: "node"; id: number; lat: number; lon: number };
export type OsmWay = { type: "way"; id: number; nodes: number[]; tags?: Record<string, string> };
export type OsmData = { elements: (OsmNode | OsmWay | { type: string })[] };

export type BBox = { south: number; west: number; north: number; east: number };

/** Result of one shortest-path search on the road graph (distance excludes the snap legs). */
export type SearchResult = { distanceM: number; path: number[]; visited: number };

export type AlgoStats = { distanceM: number; visited: number; ms: number };

/** Stored result for one profile (walk or drive) of one hotel -> place pair. */
export type RouteResult = {
  /** Door to door road distance in metres: hotel->road + road route + road->place. */
  distanceM: number;
  /** Simplified polyline from the hotel pin to the place pin, [lat, lng]. */
  path: Pt[];
  astar: AlgoStats;
  dijkstra: AlgoStats;
  /** How far the two pins are from the nearest road segment (metres). */
  snapM: { from: number; to: number };
};

export type RouteFailure = "no_road_near" | "unreachable" | "too_far";

/** What we store (as JSON) in Attraction.routes. */
export type PlaceRoutes = {
  v: 1;
  computedAt: string;
  walk: RouteResult | null;
  drive: RouteResult | null;
  walkReason?: RouteFailure;
  driveReason?: RouteFailure;
};

export class RoutingError extends Error {
  constructor(
    message: string,
    public code: "overpass_unavailable" | "too_large" | "bad_response" | "too_far",
  ) {
    super(message);
    this.name = "RoutingError";
  }
}
