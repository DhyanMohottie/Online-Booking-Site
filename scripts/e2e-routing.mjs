// Road-distance (A* / Dijkstra) integration test. Needs:
//   - scripts/mock-overpass.mjs running (default http://127.0.0.1:3199)
//   - the app running with OVERPASS_URL pointing at it, and DATABASE_URL set to the same database here.
// Usage:  node scripts/e2e-routing.mjs   (BASE env for the app, MOCK env for the mock)
import { PrismaClient } from "@prisma/client";
import { at } from "./mock-overpass.mjs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const MOCK = process.env.MOCK ?? "http://127.0.0.1:3199";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prisma = new PrismaClient();

class Client {
  jar = {};
  async req(path, opts = {}) {
    const headers = { ...(opts.headers ?? {}), cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ") };
    const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      this.jar[kv.slice(0, i)] = kv.slice(i + 1);
    }
    return res;
  }
  async login(email, password = "password123") {
    const csrf = await (await this.req("/api/auth/csrf")).json();
    await this.req("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, json: "true" }),
    });
    return (await (await this.req("/api/auth/session")).json())?.user ?? null;
  }
  async json(method, path, body) {
    const res = await this.req(path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
}

// --- geometry helpers (same maths as the app) ---
const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const chain = (...pts) => pts.slice(1).reduce((sum, p, i) => sum + hav(pts[i], p), 0);

const owner = new Client(), owner2 = new Client(), customer = new Client(), admin = new Client(), anon = new Client();
await owner.login("owner1@demo.com");
await owner2.login("owner2@demo.com");
await customer.login("customer1@demo.com");
await admin.login("admin@demo.com");

// Fixture: hotel pin sits inside a block on the ONE-WAY row y=5 of the mock grid.
const hotelPin = at(9.3, 5.1);
const hotelBody = (pin) => ({
  name: `Routing Hotel ${Date.now()}`, description: "A hotel created by the routing test.", city: "Gridtown", country: "Nowhere",
  address: "1 Grid St", starRating: 4, amenities: ["WiFi"], imageUrls: ["https://picsum.photos/seed/route/800/600"],
  ...(pin ? { latitude: pin.lat, longitude: pin.lng } : {}),
});
const baseBody = hotelBody(hotelPin);
let r = await owner.json("POST", "/api/hotels", baseBody);
check("owner creates hotel with a pin", r.status === 201, JSON.stringify(r));
const hotelId = r.body.id;
await admin.json("PATCH", `/api/admin/hotels/${hotelId}`, { status: "APPROVED" });

const addPlace = async (name, pin) => {
  const res = await owner.json("POST", `/api/hotels/${hotelId}/attractions`, { name, category: "Landmark", description: "", latitude: pin.lat, longitude: pin.lng });
  return res.body.id;
};
const pinA = at(1.3, 5.1), pinB = at(4.9, 9.1);
const idA = await addPlace("West Plaza", pinA);
const idB = await addPlace("Corner Park", pinB);
const idC = await addPlace("Lost Hill", { lat: pinA.lat + 0.03, lng: pinA.lng }); // ~3 km north, no road near
const idD = await addPlace("Far Away", { lat: hotelPin.lat + 1, lng: hotelPin.lng }); // > 8 km

const routesOf = async (id) => {
  const row = await prisma.attraction.findUnique({ where: { id } });
  return { row, routes: row?.routes ? JSON.parse(row.routes) : null };
};

// --- authorization / validation ---
check("anon cannot calculate routes", (await anon.json("POST", `/api/hotels/${hotelId}/routes`, {})).status === 401);
check("customer cannot calculate routes", (await customer.json("POST", `/api/hotels/${hotelId}/routes`, {})).status === 403);
check("other owner cannot calculate routes", (await owner2.json("POST", `/api/hotels/${hotelId}/routes`, {})).status === 403);
r = await owner.json("POST", "/api/hotels", hotelBody(null));
const noPinId = r.body.id;
r = await owner.json("POST", `/api/hotels/${noPinId}/routes`, {});
check("hotel without a pin is refused (400)", r.status === 400 && /location/i.test(r.body.error ?? ""), JSON.stringify(r));
check("nothing stored before calculating", (await routesOf(idA)).routes === null);

// --- calculation with known answers ---
r = await owner.json("POST", `/api/hotels/${hotelId}/routes`, {});
check("owner calculates routes for all places", r.status === 200 && r.body.updated === 2 && r.body.failed === 2, JSON.stringify(r));

const A = (await routesOf(idA)).routes;
const B = (await routesOf(idB)).routes;
const snapLeg = (from, to) => hav(from, to);

// Place A: straight along the one-way row for walkers; cars must detour via row y=4.
const walkA = chain(hotelPin, at(9.3, 5), at(1.3, 5), pinA); // pin -> road, road, road -> pin
const driveA = snapLeg(hotelPin, at(9.3, 5)) + chain(at(9.3, 5), at(10, 5), at(10, 4), at(1, 4), at(1, 5), at(1.3, 5)) + snapLeg(at(1.3, 5), pinA);
check("A: walking distance = along the row (known answer)", A?.walk && near(A.walk.distanceM, walkA, 4), `${A?.walk?.distanceM} vs ${walkA}`);
check("A: driving distance detours around the one-way (known answer)", A?.drive && near(A.drive.distanceM, driveA, 4), `${A?.drive?.distanceM} vs ${driveA}`);
check("A: one-way makes driving longer than walking", A?.drive?.distanceM > A?.walk?.distanceM + 300, `${A?.drive?.distanceM} ${A?.walk?.distanceM}`);

// Place B: pedestrians use the footway shortcut, cars go around the blocks.
const walkB = snapLeg(hotelPin, at(9.3, 5)) + chain(at(9.3, 5), at(9, 5), at(7, 7), at(5, 9), at(5, 9.1)) + snapLeg(at(5, 9.1), pinB);
const driveB = snapLeg(hotelPin, at(9.3, 5)) + chain(at(9.3, 5), at(10, 5), at(10, 9), at(5, 9), at(5, 9.1)) + snapLeg(at(5, 9.1), pinB);
check("B: walking uses the footway shortcut (known answer)", B?.walk && near(B.walk.distanceM, walkB, 4), `${B?.walk?.distanceM} vs ${walkB}`);
check("B: driving follows the streets (known answer)", B?.drive && near(B.drive.distanceM, driveB, 4), `${B?.drive?.distanceM} vs ${driveB}`);
check("B: footway makes walking shorter than driving", B?.walk?.distanceM < B?.drive?.distanceM - 100);

for (const [label, routes, pin] of [["A", A, pinA], ["B", B, pinB]]) {
  for (const mode of ["walk", "drive"]) {
    const m = routes?.[mode];
    const straight = hav(hotelPin, pin);
    check(`${label} ${mode}: road distance >= straight line`, m && m.distanceM >= Math.floor(straight), `${m?.distanceM} < ${straight}`);
    check(`${label} ${mode}: A* and Dijkstra agree`, m && m.astar.distanceM === m.dijkstra.distanceM, JSON.stringify(m && [m.astar, m.dijkstra]));
    check(`${label} ${mode}: A* explored no more nodes than Dijkstra`, m && m.astar.visited <= m.dijkstra.visited, JSON.stringify(m && [m.astar.visited, m.dijkstra.visited]));
    const p = m?.path ?? [];
    check(
      `${label} ${mode}: path runs from the hotel pin to the place pin`,
      p.length >= 2 && near(p[0][0], hotelPin.lat, 1e-5) && near(p[0][1], hotelPin.lng, 1e-5) && near(p.at(-1)[0], pin.lat, 1e-5) && near(p.at(-1)[1], pin.lng, 1e-5),
      JSON.stringify(p.slice(0, 2)),
    );
  }
}
const isAt = ([la, ln], g) => near(la, g.lat, 2e-5) && near(ln, g.lon ?? g.lng, 2e-5);
const wp = B?.walk?.path ?? [];
check("B: the walking path cuts the corner along the footway (one straight segment)", wp.some((pt, i) => i + 1 < wp.length && isAt(pt, at(9, 5)) && isAt(wp[i + 1], at(5, 9))), JSON.stringify(wp));

// --- failure reasons ---
const C = (await routesOf(idC)).routes;
const D = (await routesOf(idD)).routes;
check("C: pin far from any road = no_road_near", C && C.walk === null && C.drive === null && C.walkReason === "no_road_near", JSON.stringify(C));
check("D: more than 8 km away = too_far", D && D.walkReason === "too_far" && D.driveReason === "too_far", JSON.stringify(D));

// --- throttle ---
r = await owner.json("POST", `/api/hotels/${hotelId}/routes`, { placeId: idA });
check("immediate second call is throttled (429 + retryAfter)", r.status === 429 && r.body.retryAfter >= 1, JSON.stringify(r));
await sleep(4500);
r = await owner.json("POST", `/api/hotels/${hotelId}/routes`, { placeId: idA });
check("single-place recalculation works after the cool-down", r.status === 200 && r.body.updated === 1, JSON.stringify(r));
await sleep(4500);
r = await owner.json("POST", `/api/hotels/${hotelId}/routes`, { placeId: "does-not-exist" });
check("unknown placeId = 404", r.status === 404, JSON.stringify(r));

// --- graceful failure when OpenStreetMap is unavailable ---
await fetch(`${MOCK}/__fail?on=1`);
await sleep(4500);
const before = (await routesOf(idA)).row.routes;
r = await owner.json("POST", `/api/hotels/${hotelId}/routes`, {});
check("Overpass failure -> 502 with a readable message", r.status === 502 && /unavailable/i.test(r.body.error ?? ""), JSON.stringify(r));
check("failure leaves saved routes untouched", (await routesOf(idA)).row.routes === before);
await fetch(`${MOCK}/__fail?on=0`);

// --- public page reads the stored routes (guests never trigger routing) ---
const count0 = await (await fetch(`${MOCK}/__count`)).text();
const html = await (await anon.req(`/hotels/${hotelId}`)).text();
check("public page shows the Walk / Drive toggle", html.includes('data-testid="mode-walk"') && html.includes('data-testid="mode-drive"'));
check("public page lists walking road distances", /\d+(\.\d)? km · ~\d+ min walk|\d+ m · ~\d+ min walk/.test(html.replace(/<!-- -->/g, "")));
check("viewing the page does not call Overpass", (await (await fetch(`${MOCK}/__count`)).text()) === count0);

// --- invalidation ---
await sleep(1000);
r = await owner.json("PUT", `/api/hotels/${hotelId}`, baseBody); // same pin
check("saving the hotel with the same pin keeps routes", (await routesOf(idB)).routes !== null, r.status);
const movedA = at(1.3, 5.1);
r = await owner.json("PUT", `/api/attractions/${idA}`, { name: "West Plaza", category: "Landmark", description: "now with a note", latitude: movedA.lat, longitude: movedA.lng });
check("editing a place without moving it keeps its routes", r.status === 200 && (await routesOf(idA)).routes !== null);
r = await owner.json("PUT", `/api/attractions/${idA}`, { name: "West Plaza", category: "Landmark", description: "", latitude: movedA.lat + 0.0002, longitude: movedA.lng });
const moved = await routesOf(idA);
check("moving a place clears only its routes", moved.routes === null && moved.row.routesAt === null && (await routesOf(idB)).routes !== null);
r = await owner.json("PUT", `/api/hotels/${hotelId}`, hotelBody(at(9.3, 5.2)));
check("moving the hotel pin clears every place's routes", (await Promise.all([idA, idB, idC, idD].map(routesOf))).every((x) => x.routes === null), r.status);

// --- guests fall back to the straight line ---
const html2 = await (await anon.req(`/hotels/${hotelId}`)).text();
check("without routes the toggle is hidden and the note says straight-line", !html2.includes('data-testid="mode-walk"') && /straight-line/.test(html2));

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
