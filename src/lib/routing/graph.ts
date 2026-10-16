import { haversineM, toLocalMetres } from "./geometry";
import { wayAllowed, wayDirection } from "./profiles";
import type { LatLng, OsmData, OsmNode, OsmWay, Profile } from "./types";

export type Edge = { to: number; w: number };
/** A road piece between two graph nodes, with the directions it may be travelled in. */
export type Segment = { a: number; b: number; fwd: Edge | null; bwd: Edge | null };

/** Weighted directed road graph. Edge weights are metres. Node ids are dense indexes. */
export class RoadGraph {
  lat: number[] = [];
  lng: number[] = [];
  adj: Edge[][] = [];
  segments: Segment[] = [];

  addNode(lat: number, lng: number): number {
    this.lat.push(lat);
    this.lng.push(lng);
    this.adj.push([]);
    return this.lat.length - 1;
  }

  /** Directed edge a -> b with an explicit weight. */
  addEdge(a: number, b: number, w: number): Edge {
    const e = { to: b, w };
    this.adj[a].push(e);
    return e;
  }

  private removeEdge(from: number, e: Edge | null): void {
    if (!e) return;
    const i = this.adj[from].indexOf(e);
    if (i !== -1) this.adj[from].splice(i, 1);
  }

  /**
   * Split a road piece at a new node so later snaps and searches see the two halves: the original
   * a-b edges are removed and replaced by a-v and v-b with the same directions.
   */
  splitSegment(index: number, v: number): void {
    const s = this.segments[index];
    const wa = haversineM(this.lat[s.a], this.lng[s.a], this.lat[v], this.lng[v]);
    const wb = haversineM(this.lat[v], this.lng[v], this.lat[s.b], this.lng[s.b]);
    this.removeEdge(s.a, s.fwd);
    this.removeEdge(s.b, s.bwd);
    this.segments[index] = {
      a: s.a,
      b: v,
      fwd: s.fwd ? this.addEdge(s.a, v, wa) : null,
      bwd: s.bwd ? this.addEdge(v, s.a, wa) : null,
    };
    this.segments.push({
      a: v,
      b: s.b,
      fwd: s.fwd ? this.addEdge(v, s.b, wb) : null,
      bwd: s.bwd ? this.addEdge(s.b, v, wb) : null,
    });
  }

  /** Road piece a-b; its weight is the great-circle length of the piece. */
  addSegment(a: number, b: number, fwd: boolean, bwd: boolean): void {
    const w = haversineM(this.lat[a], this.lng[a], this.lat[b], this.lng[b]);
    this.segments.push({ a, b, fwd: fwd ? this.addEdge(a, b, w) : null, bwd: bwd ? this.addEdge(b, a, w) : null });
  }

  get nodeCount(): number {
    return this.lat.length;
  }
}

/** Build the graph for one profile from Overpass JSON (ways with tags + their nodes). */
export function buildGraph(data: OsmData, profile: Profile): RoadGraph {
  const coords = new Map<number, OsmNode>();
  const ways: OsmWay[] = [];
  for (const el of data.elements) {
    if (el.type === "node") coords.set((el as OsmNode).id, el as OsmNode);
    else if (el.type === "way") ways.push(el as OsmWay);
  }

  const g = new RoadGraph();
  const index = new Map<number, number>();
  const nodeFor = (osmId: number): number | null => {
    const known = index.get(osmId);
    if (known !== undefined) return known;
    const n = coords.get(osmId);
    if (!n) return null;
    const i = g.addNode(n.lat, n.lon);
    index.set(osmId, i);
    return i;
  };

  for (const way of ways) {
    if (!way.nodes || way.nodes.length < 2 || !wayAllowed(profile, way.tags)) continue;
    const dir = wayDirection(profile, way.tags);
    for (let i = 0; i + 1 < way.nodes.length; i++) {
      if (way.nodes[i] === way.nodes[i + 1]) continue;
      const a = nodeFor(way.nodes[i]);
      const b = nodeFor(way.nodes[i + 1]);
      if (a === null || b === null) continue;
      g.addSegment(a, b, dir !== "backward", dir !== "forward");
    }
  }
  return g;
}

export type Snap = { node: number; snapM: number };

/**
 * Attach a point to the road network: project it onto the nearest road segment and insert a virtual
 * node there (the segment is split, respecting one-way directions), so distances are exact to the metre rather than rounded
 * to the nearest junction. Returns null when no road is within `maxM` metres.
 */
export function snapToGraph(g: RoadGraph, p: LatLng, maxM = 300): Snap | null {
  let best = -1;
  let bestDist = Infinity;
  let bestT = 0;
  for (let i = 0; i < g.segments.length; i++) {
    const s = g.segments[i];
    const [ax, ay] = toLocalMetres(g.lat[s.a], g.lng[s.a], p.lat, p.lng);
    const [bx, by] = toLocalMetres(g.lat[s.b], g.lng[s.b], p.lat, p.lng);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < bestDist) {
      bestDist = d;
      best = i;
      bestT = t;
    }
  }
  if (best === -1 || bestDist > maxM) return null;

  const s = g.segments[best];
  if (bestT <= 1e-9) return { node: s.a, snapM: bestDist };
  if (bestT >= 1 - 1e-9) return { node: s.b, snapM: bestDist };

  const vLat = g.lat[s.a] + bestT * (g.lat[s.b] - g.lat[s.a]);
  const vLng = g.lng[s.a] + bestT * (g.lng[s.b] - g.lng[s.a]);
  const v = g.addNode(vLat, vLng);
  g.splitSegment(best, v);
  return { node: v, snapM: bestDist };
}
