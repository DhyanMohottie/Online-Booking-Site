import { MinHeap } from "./heap";
import { haversineM } from "./geometry";
import type { RoadGraph } from "./graph";
import type { SearchResult } from "./types";

/**
 * A* search: like Dijkstra, but nodes are ordered by  f(n) = g(n) + h(n)  where g is the distance travelled
 * so far and h is the straight-line distance still to go. Because no road is shorter than the straight line
 * (admissible) and the triangle inequality holds (consistent), A* returns the same optimal distance as
 * Dijkstra while exploring far fewer nodes: it is pulled towards the target.
 */
export function astar(g: RoadGraph, source: number, target: number): SearchResult | null {
  const n = g.nodeCount;
  const tLat = g.lat[target];
  const tLng = g.lng[target];
  const h = (v: number) => haversineM(g.lat[v], g.lng[v], tLat, tLng);

  const gScore = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap<number>();
  let visited = 0;

  gScore[source] = 0;
  open.push(source, h(source));
  while (open.size > 0) {
    const u = (open.pop() as { item: number }).item;
    if (closed[u]) continue;
    closed[u] = 1;
    visited++;
    if (u === target) break;
    for (const e of g.adj[u]) {
      const tentative = gScore[u] + e.w;
      if (tentative < gScore[e.to]) {
        gScore[e.to] = tentative;
        prev[e.to] = u;
        open.push(e.to, tentative + h(e.to));
      }
    }
  }
  if (!closed[target]) return null;

  const path: number[] = [];
  for (let v = target; v !== -1; v = prev[v]) path.push(v);
  path.reverse();
  return { distanceM: gScore[target], path, visited };
}
