import { astar } from "./astar";
import { dijkstra } from "./dijkstra";
import { haversineM, simplifyPath } from "./geometry";
import { buildGraph, snapToGraph } from "./graph";
import type { RoadGraph } from "./graph";
import { fetchRoadData } from "./overpass";
import type { AlgoStats, BBox, LatLng, OsmData, PlaceRoutes, Profile, Pt, RouteFailure, RouteResult } from "./types";

/** Farther than this (straight line) we do not try to route: a long walk/drive, and a huge map download. */
export const MAX_ROUTE_M = 8000;
const BBOX_MARGIN_M = 600;
const SIMPLIFY_TOLERANCE_M = 4;
const PROFILES: Profile[] = ["walk", "drive"];

export type RoutePlace = { id: string; lat: number; lng: number };
export type ComputeOptions = { fetchData?: (bbox: BBox) => Promise<OsmData> };

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function boundsOf(points: LatLng[], marginM: number): BBox {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const dLat = marginM / 111_320;
  const dLng = marginM / (111_320 * Math.max(0.01, Math.cos((midLat * Math.PI) / 180)));
  return {
    south: Math.min(...lats) - dLat,
    north: Math.max(...lats) + dLat,
    west: Math.min(...lngs) - dLng,
    east: Math.max(...lngs) + dLng,
  };
}

function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = performance.now();
  const value = fn();
  return { value, ms: Math.round((performance.now() - t0) * 100) / 100 };
}

export type PairOutcome = { ok: RouteResult } | { fail: RouteFailure };

/**
 * Route between two already-snapped graph nodes with BOTH algorithms. They must agree on the distance
 * (A* with an admissible heuristic is optimal); if they ever disagree we trust Dijkstra.
 */
export function routeBetween(
  g: RoadGraph,
  from: LatLng,
  to: LatLng,
  fromSnap: { node: number; snapM: number },
  toSnap: { node: number; snapM: number },
): PairOutcome {
  const dj = timed(() => dijkstra(g, fromSnap.node, toSnap.node));
  const as = timed(() => astar(g, fromSnap.node, toSnap.node));
  if (!dj.value || !as.value) return { fail: "unreachable" };

  const best = Math.abs(dj.value.distanceM - as.value.distanceM) < 0.5 ? as.value : dj.value;
  const roadPath: Pt[] = best.path.map((i) => [g.lat[i], g.lng[i]]);
  const full: Pt[] = [[from.lat, from.lng], ...roadPath, [to.lat, to.lng]];
  const path = simplifyPath(full, SIMPLIFY_TOLERANCE_M).map(([la, ln]) => [round5(la), round5(ln)] as Pt);

  const stats = (r: { distanceM: number; visited: number }, ms: number): AlgoStats => ({
    distanceM: Math.round(r.distanceM + fromSnap.snapM + toSnap.snapM),
    visited: r.visited,
    ms,
  });
  return {
    ok: {
      distanceM: Math.round(dj.value.distanceM + fromSnap.snapM + toSnap.snapM),
      path,
      astar: stats(as.value, as.ms),
      dijkstra: stats(dj.value, dj.ms),
      snapM: { from: Math.round(fromSnap.snapM), to: Math.round(toSnap.snapM) },
    },
  };
}

/**
 * Compute walking and driving road routes from a hotel to each place using one OpenStreetMap download.
 * Throws RoutingError when the road data cannot be fetched; per-place problems are returned as reasons.
 */
export async function computeRoutes(
  hotel: LatLng,
  places: RoutePlace[],
  options: ComputeOptions = {},
): Promise<Map<string, PlaceRoutes>> {
  const out = new Map<string, PlaceRoutes>();
  const computedAt = new Date().toISOString();
  const near = places.filter((p) => haversineM(hotel.lat, hotel.lng, p.lat, p.lng) <= MAX_ROUTE_M);

  for (const p of places) {
    if (!near.includes(p)) {
      out.set(p.id, {
        v: 1,
        computedAt,
        walk: null,
        drive: null,
        walkReason: "too_far",
        driveReason: "too_far",
      });
    }
  }
  if (near.length === 0) return out;

  const data = await (options.fetchData ?? fetchRoadData)(boundsOf([hotel, ...near], BBOX_MARGIN_M));

  const results = new Map<string, PlaceRoutes>(
    near.map((p) => [p.id, { v: 1, computedAt, walk: null, drive: null } as PlaceRoutes]),
  );

  for (const profile of PROFILES) {
    const g = buildGraph(data, profile);
    const hotelSnap = snapToGraph(g, hotel);
    for (const p of near) {
      const entry = results.get(p.id) as PlaceRoutes;
      const set = (route: RouteResult | null, reason?: RouteFailure) => {
        if (profile === "walk") {
          entry.walk = route;
          if (reason) entry.walkReason = reason;
        } else {
          entry.drive = route;
          if (reason) entry.driveReason = reason;
        }
      };
      const placeSnap = hotelSnap ? snapToGraph(g, p) : null;
      if (!hotelSnap || !placeSnap) {
        set(null, "no_road_near");
        continue;
      }
      const outcome = routeBetween(g, hotel, p, hotelSnap, placeSnap);
      if ("ok" in outcome) set(outcome.ok);
      else set(null, outcome.fail);
    }
  }

  for (const [id, r] of results) out.set(id, r);
  return out;
}
