// A tiny Overpass-compatible server that serves a synthetic street grid, so the road-distance feature can
// be tested offline and deterministically.   node scripts/mock-overpass.mjs   (PORT env, default 3199)
// Then start the app with:  OVERPASS_URL=http://127.0.0.1:3199/api/interpreter
//
// The grid (x east, y north, 0..10) has 0.001 degree spacing and its south-west corner at ORIGIN:
//   - every grid line is a two-way residential street, EXCEPT row y=5, which is one-way eastbound;
//   - a pedestrian-only footway cuts the corner from (9,5) to (5,9);
//   - a motorway far outside the grid is included so profile filtering is exercised.
// Control endpoints:  GET /__fail?on=1|0  (answer every query with HTTP 500),  GET /__count  (queries served).
import http from "node:http";
import { fileURLToPath } from "node:url";

export const ORIGIN = { lat: 40.7, lng: -74.0 };
export const STEP = 0.001;
const SIZE = 10;

export function buildGrid() {
  const elements = [];
  const id = (x, y) => 1000 + y * 100 + x;
  for (let y = 0; y <= SIZE; y++) {
    for (let x = 0; x <= SIZE; x++) {
      elements.push({ type: "node", id: id(x, y), lat: ORIGIN.lat + y * STEP, lon: ORIGIN.lng + x * STEP });
    }
  }
  let wayId = 1;
  for (let y = 0; y <= SIZE; y++) {
    const nodes = Array.from({ length: SIZE + 1 }, (_, x) => id(x, y));
    elements.push({ type: "way", id: wayId++, nodes, tags: { highway: "residential", ...(y === 5 ? { oneway: "yes" } : {}) } });
  }
  for (let x = 0; x <= SIZE; x++) {
    const nodes = Array.from({ length: SIZE + 1 }, (_, y) => id(x, y));
    elements.push({ type: "way", id: wayId++, nodes, tags: { highway: "residential" } });
  }
  // Pedestrian shortcut across the block corner: (9,5) -> (5,9)
  elements.push({ type: "node", id: 9001, lat: ORIGIN.lat + 7 * STEP, lon: ORIGIN.lng + 7 * STEP });
  elements.push({ type: "way", id: wayId++, nodes: [id(9, 5), 9001, id(5, 9)], tags: { highway: "footway" } });
  // Cars only, far away from everything.
  elements.push({ type: "node", id: 9100, lat: ORIGIN.lat + 0.05, lon: ORIGIN.lng });
  elements.push({ type: "node", id: 9101, lat: ORIGIN.lat + 0.05, lon: ORIGIN.lng + 0.01 });
  elements.push({ type: "way", id: wayId++, nodes: [9100, 9101], tags: { highway: "motorway" } });
  return { elements };
}

/** Position of grid point (x, y), allowing fractions. */
export const at = (x, y) => ({ lat: ORIGIN.lat + y * STEP, lng: ORIGIN.lng + x * STEP });

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const grid = JSON.stringify(buildGrid());
  let failing = false;
  let count = 0;
  http
    .createServer((req, res) => {
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/__fail") {
        failing = url.searchParams.get("on") === "1";
        return res.end(String(failing));
      }
      if (url.pathname === "/__count") return res.end(String(count));
      req.resume();
      req.on("end", () => {
        count++;
        if (failing) {
          res.writeHead(500);
          return res.end("mock failure");
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(grid);
      });
    })
    .listen(Number(process.env.PORT ?? 3199), "127.0.0.1", () => console.log("mock overpass ready"));
}
