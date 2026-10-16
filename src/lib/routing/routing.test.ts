import { describe, expect, it } from "vitest";
import { formatDuration, walkMinutes } from "../geo";
import { astar } from "./astar";
import { dijkstra } from "./dijkstra";
import { haversineM, simplifyPath } from "./geometry";
import { buildGraph, RoadGraph, snapToGraph } from "./graph";
import { MinHeap } from "./heap";
import { wayAllowed, wayDirection } from "./profiles";
import { computeRoutes } from "./route";
import type { OsmData } from "./types";
import { routesView } from "./view";

/** Deterministic PRNG so the property test is reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("MinHeap", () => {
  it("pops in priority order", () => {
    const h = new MinHeap<string>();
    [5, 1, 4, 2, 3].forEach((p) => h.push(`p${p}`, p));
    const order: string[] = [];
    while (h.size) order.push((h.pop() as { item: string }).item);
    expect(order).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(h.pop()).toBeUndefined();
  });
});

describe("profiles", () => {
  it("lets cars use roads but not footways, and walkers the reverse of motorways", () => {
    expect(wayAllowed("drive", { highway: "residential" })).toBe(true);
    expect(wayAllowed("drive", { highway: "footway" })).toBe(false);
    expect(wayAllowed("walk", { highway: "footway" })).toBe(true);
    expect(wayAllowed("walk", { highway: "motorway" })).toBe(false);
    expect(wayAllowed("walk", { highway: "residential" })).toBe(true);
  });
  it("honours access tags", () => {
    expect(wayAllowed("drive", { highway: "residential", access: "private" })).toBe(false);
    expect(wayAllowed("drive", { highway: "residential", access: "no", motor_vehicle: "yes" })).toBe(true);
    expect(wayAllowed("walk", { highway: "residential", foot: "no" })).toBe(false);
    expect(wayAllowed("walk", { highway: "cycleway" })).toBe(false);
    expect(wayAllowed("walk", { highway: "cycleway", foot: "yes" })).toBe(true);
    expect(wayAllowed("drive", { highway: "service", service: "parking_aisle" })).toBe(false);
  });
  it("applies one-way rules to driving only", () => {
    expect(wayDirection("drive", { highway: "residential", oneway: "yes" })).toBe("forward");
    expect(wayDirection("drive", { highway: "residential", oneway: "-1" })).toBe("backward");
    expect(wayDirection("drive", { highway: "primary", junction: "roundabout" })).toBe("forward");
    expect(wayDirection("drive", { highway: "motorway" })).toBe("forward");
    expect(wayDirection("drive", { highway: "residential" })).toBe("both");
    expect(wayDirection("walk", { highway: "residential", oneway: "yes" })).toBe("both");
  });
});

describe("dijkstra and astar", () => {
  it("find the same known shortest path around a block", () => {
    const g = new RoadGraph();
    const pts: [number, number][] = [[0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0]];
    pts.forEach(([la, ln]) => g.addNode(la, ln));
    [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([x, y]) => g.addSegment(x, y, true, true));
    const d = dijkstra(g, 0, 2);
    const a = astar(g, 0, 2);
    const expected = haversineM(0, 0, 0, 0.001) + haversineM(0, 0.001, 0.001, 0.001);
    expect(d?.distanceM).toBeCloseTo(expected, 6);
    expect(a?.distanceM).toBeCloseTo(expected, 6);
    expect(d?.path).toHaveLength(3);
    expect(a?.path).toHaveLength(3);
  });
  it("handles same point, unreachable targets and one-way edges", () => {
    const g = new RoadGraph();
    const a = g.addNode(0, 0);
    const b = g.addNode(0, 0.001);
    const c = g.addNode(0, 0.002);
    g.addSegment(a, b, true, false); // a -> b only
    expect(dijkstra(g, a, a)?.distanceM).toBe(0);
    expect(astar(g, a, a)?.path).toEqual([a]);
    expect(dijkstra(g, a, b)).not.toBeNull();
    expect(dijkstra(g, b, a)).toBeNull();
    expect(astar(g, b, a)).toBeNull();
    expect(dijkstra(g, a, c)).toBeNull();
    expect(astar(g, a, c)).toBeNull();
  });
  it("agree on random graphs, and A* never explores more than Dijkstra", () => {
    const rand = mulberry32(12345);
    let astarFewer = 0;
    for (let trial = 0; trial < 60; trial++) {
      const g = new RoadGraph();
      const n = 60 + Math.floor(rand() * 60);
      for (let i = 0; i < n; i++) g.addNode(rand() * 0.02, rand() * 0.02);
      for (let i = 0; i < n * 3; i++) {
        const a = Math.floor(rand() * n);
        const b = Math.floor(rand() * n);
        if (a !== b) g.addSegment(a, b, rand() < 0.9, rand() < 0.6);
      }
      for (let q = 0; q < 5; q++) {
        const s = Math.floor(rand() * n);
        const t = Math.floor(rand() * n);
        const d = dijkstra(g, s, t);
        const a = astar(g, s, t);
        expect(a === null).toBe(d === null);
        if (d && a) {
          expect(a.distanceM).toBeCloseTo(d.distanceM, 6);
          expect(a.visited).toBeLessThanOrEqual(d.visited + 1);
          if (a.visited < d.visited) astarFewer++;
          // path length equals the reported distance
          let len = 0;
          for (let i = 0; i + 1 < a.path.length; i++) {
            const u = a.path[i];
            const v = a.path[i + 1];
            len += Math.min(...g.adj[u].filter((e) => e.to === v).map((e) => e.w));
          }
          expect(len).toBeCloseTo(a.distanceM, 6);
        }
      }
    }
    expect(astarFewer).toBeGreaterThan(20);
  });
});

/** A straight east-west street of 3 nodes, ~111 m apart. */
function street(oneway?: string): OsmData {
  return {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 0.001 },
      { type: "node", id: 3, lat: 0, lon: 0.002 },
      { type: "way", id: 10, nodes: [1, 2, 3], tags: { highway: "residential", ...(oneway ? { oneway } : {}) } },
    ],
  };
}

describe("graph building and snapping", () => {
  it("snaps onto the middle of a segment with a virtual node", () => {
    const g = buildGraph(street(), "walk");
    const snap = snapToGraph(g, { lat: 0.0001, lng: 0.0005 });
    expect(snap).not.toBeNull();
    expect(snap?.snapM).toBeGreaterThan(10);
    expect(snap?.snapM).toBeLessThan(12);
    expect(g.lng[snap?.node as number]).toBeCloseTo(0.0005, 6);
  });
  it("refuses to snap when no road is within the limit", () => {
    const g = buildGraph(street(), "walk");
    expect(snapToGraph(g, { lat: 0.05, lng: 0.001 })).toBeNull();
    expect(snapToGraph(new RoadGraph(), { lat: 0, lng: 0 })).toBeNull();
  });
  it("two points on the same segment connect directly rather than via the junctions", () => {
    const g = buildGraph(street(), "walk");
    const a = snapToGraph(g, { lat: 0, lng: 0.0003 }) as { node: number };
    const b = snapToGraph(g, { lat: 0, lng: 0.0007 }) as { node: number };
    const r = dijkstra(g, a.node, b.node);
    expect(r?.distanceM).toBeCloseTo(haversineM(0, 0.0003, 0, 0.0007), 3);
  });
  it("respects one-way streets for driving but not for walking", () => {
    const forward = buildGraph(street("yes"), "drive");
    const f1 = snapToGraph(forward, { lat: 0, lng: 0.0003 }) as { node: number };
    const f2 = snapToGraph(forward, { lat: 0, lng: 0.0017 }) as { node: number };
    expect(dijkstra(forward, f1.node, f2.node)).not.toBeNull();
    expect(dijkstra(forward, f2.node, f1.node)).toBeNull();
    const walking = buildGraph(street("yes"), "walk");
    const w1 = snapToGraph(walking, { lat: 0, lng: 0.0003 }) as { node: number };
    const w2 = snapToGraph(walking, { lat: 0, lng: 0.0017 }) as { node: number };
    expect(dijkstra(walking, w2.node, w1.node)).not.toBeNull();
  });
});

describe("simplifyPath", () => {
  it("drops collinear points and keeps corners", () => {
    const line: [number, number][] = [[0, 0], [0, 0.0005], [0, 0.001], [0.001, 0.001]];
    expect(simplifyPath(line, 4)).toEqual([[0, 0], [0, 0.001], [0.001, 0.001]]);
    expect(simplifyPath([[1, 1]], 4)).toEqual([[1, 1]]);
  });
});

describe("computeRoutes", () => {
  const hotel = { lat: 0.0001, lng: 0.0002 };
  it("returns door-to-door distances for walking and driving using supplied road data", async () => {
    const res = await computeRoutes(hotel, [{ id: "p", lat: 0.0001, lng: 0.0018 }], { fetchData: async () => street() });
    const r = res.get("p");
    expect(r?.walk).not.toBeNull();
    expect(r?.drive).not.toBeNull();
    const straight = haversineM(hotel.lat, hotel.lng, 0.0001, 0.0018);
    expect(r?.walk?.distanceM).toBeGreaterThanOrEqual(Math.floor(straight));
    expect(r?.walk?.astar.distanceM).toBe(r?.walk?.dijkstra.distanceM);
    expect(r?.walk?.path[0]).toEqual([0.0001, 0.0002]);
  });
  it("marks places that are too far, and places with no road nearby", async () => {
    const res = await computeRoutes(
      hotel,
      [{ id: "far", lat: 0.5, lng: 0.5 }, { id: "lost", lat: 0.0001, lng: 0.02 }],
      { fetchData: async () => street() },
    );
    expect(res.get("far")?.walkReason).toBe("too_far");
    expect(res.get("lost")?.walkReason).toBe("no_road_near");
    expect(res.get("lost")?.drive).toBeNull();
  });
  it("only skips the download when nothing is within range", async () => {
    let calls = 0;
    await computeRoutes(hotel, [{ id: "far", lat: 5, lng: 5 }], { fetchData: async () => (calls++, street()) });
    expect(calls).toBe(0);
  });
  it("propagates road-data failures", async () => {
    await expect(
      computeRoutes(hotel, [{ id: "p", lat: 0.0001, lng: 0.0018 }], {
        fetchData: async () => {
          throw new Error("down");
        },
      }),
    ).rejects.toThrow("down");
  });
});

describe("views and walking time", () => {
  it("walks at about 5 km/h", () => {
    expect(walkMinutes(5000)).toBe(60);
    expect(walkMinutes(1)).toBe(1);
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(65)).toBe("1 h 5 min");
  });
  it("treats missing or garbage JSON as not calculated", () => {
    expect(routesView(null).state).toBe("none");
    expect(routesView("not json").state).toBe("none");
    expect(routesView(JSON.stringify({ v: 2 })).state).toBe("none");
  });
  it("reports ok / failed states", async () => {
    const res = await computeRoutes({ lat: 0.0001, lng: 0.0002 }, [{ id: "p", lat: 0.0001, lng: 0.0018 }], {
      fetchData: async () => street(),
    });
    const ok = routesView(JSON.stringify(res.get("p")));
    expect(ok.state).toBe("ok");
    expect(ok.walk?.duration).toMatch(/min/);
    expect(ok.drive?.duration).toBeNull();
    const failed = routesView(
      JSON.stringify({ v: 1, computedAt: "x", walk: null, drive: null, walkReason: "unreachable", driveReason: "unreachable" }),
    );
    expect(failed.state).toBe("failed");
  });
});
