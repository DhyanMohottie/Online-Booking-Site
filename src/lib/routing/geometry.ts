import type { Pt } from "./types";

const EARTH_RADIUS_M = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Planar metres of (lat, lng) relative to an origin (accurate for the few-km areas we route in). */
export function toLocalMetres(lat: number, lng: number, originLat: number, originLng: number): [number, number] {
  const k = (Math.PI / 180) * EARTH_RADIUS_M;
  return [(lng - originLng) * Math.cos(rad(originLat)) * k, (lat - originLat) * k];
}

/** Distance in metres from point P to the segment AB (all [lat, lng]). */
function pointToSegmentM(p: Pt, a: Pt, b: Pt): number {
  const [ax, ay] = toLocalMetres(a[0], a[1], p[0], p[1]);
  const [bx, by] = toLocalMetres(b[0], b[1], p[0], p[1]);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Douglas-Peucker line simplification; keeps the end points. `toleranceM` is the max deviation. */
export function simplifyPath(points: Pt[], toleranceM: number): Pt[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop() as [number, number];
    let worst = -1;
    let worstDist = toleranceM;
    for (let i = lo + 1; i < hi; i++) {
      const d = pointToSegmentM(points[i], points[lo], points[hi]);
      if (d > worstDist) {
        worstDist = d;
        worst = i;
      }
    }
    if (worst !== -1) {
      keep[worst] = 1;
      stack.push([lo, worst], [worst, hi]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}
