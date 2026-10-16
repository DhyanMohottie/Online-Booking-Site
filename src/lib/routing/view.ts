import { formatDistance, formatDuration, walkMinutes } from "../geo";
import type { AlgoStats, PlaceRoutes, Pt, RouteFailure, RouteResult } from "./types";

/** A stored route turned into what the pages show. */
export type RouteView = {
  meters: number;
  distance: string;
  /** Walking time ("35 min"); null for driving, where we have no speed model. */
  duration: string | null;
  path: Pt[];
  astar: AlgoStats;
  dijkstra: AlgoStats;
};

export type PlaceRoutesView = {
  /** none = never calculated, ok = at least one profile has a route, failed = calculated but nothing found. */
  state: "none" | "ok" | "failed";
  walk: RouteView | null;
  drive: RouteView | null;
  walkReason: RouteFailure | null;
  driveReason: RouteFailure | null;
  computedAt: string | null;
};

const NONE: PlaceRoutesView = { state: "none", walk: null, drive: null, walkReason: null, driveReason: null, computedAt: null };

/** Parse the JSON saved in Attraction.routes; anything unexpected counts as "not calculated". */
export function parseRoutes(json: string | null | undefined): PlaceRoutes | null {
  if (!json) return null;
  try {
    const r = JSON.parse(json);
    if (r && r.v === 1 && typeof r.computedAt === "string" && "walk" in r && "drive" in r) return r as PlaceRoutes;
  } catch {
    /* fall through */
  }
  return null;
}

function toView(r: RouteResult | null, walking: boolean): RouteView | null {
  if (!r || !Array.isArray(r.path) || !Number.isFinite(r.distanceM)) return null;
  return {
    meters: r.distanceM,
    distance: formatDistance(r.distanceM / 1000),
    duration: walking ? formatDuration(walkMinutes(r.distanceM)) : null,
    path: r.path,
    astar: r.astar,
    dijkstra: r.dijkstra,
  };
}

export function routesView(json: string | null | undefined): PlaceRoutesView {
  const r = parseRoutes(json);
  if (!r) return NONE;
  const walk = toView(r.walk, true);
  const drive = toView(r.drive, false);
  return {
    state: walk || drive ? "ok" : "failed",
    walk,
    drive,
    walkReason: r.walkReason ?? null,
    driveReason: r.driveReason ?? null,
    computedAt: r.computedAt,
  };
}
