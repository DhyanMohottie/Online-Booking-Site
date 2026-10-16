import { MinHeap } from "./heap";
import type { RoadGraph } from "./graph";
import type { SearchResult } from "./types";

/**
 * Dijkstra's algorithm: always settle the unsettled node with the smallest known distance from the source.
 * Optimal for non-negative weights; explores outward in all directions until the target is settled.
 */
export function dijkstra(g: RoadGraph, source: number, target: number): SearchResult | null {
  const n = g.nodeCount;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap<number>();
  let visited = 0;

  dist[source] = 0;
  open.push(source, 0);
  while (open.size > 0) {
    const top = open.pop() as { item: number; priority: number };
    const u = top.item;
    if (closed[u]) continue; // stale heap entry
    closed[u] = 1;
    visited++;
    if (u === target) break;
    for (const e of g.adj[u]) {
      const nd = top.priority + e.w;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = u;
        open.push(e.to, nd);
      }
    }
  }
  if (!closed[target]) return null;

  const path: number[] = [];
  for (let v = target; v !== -1; v = prev[v]) path.push(v);
  path.reverse();
  return { distanceM: dist[target], path, visited };
}
