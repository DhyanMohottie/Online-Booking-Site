// End-to-end API walkthrough against a running server (BASE env or localhost:3100).
const BASE = process.env.BASE ?? "http://localhost:3100";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
};

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
    const s = await (await this.req("/api/auth/session")).json();
    return s?.user ?? null;
  }
  async json(method, path, body) {
    const res = await this.req(path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
}

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// --- auth ---
const anon = new Client();
const customer = new Client(), customer2 = new Client(), owner = new Client(), owner2 = new Client(), admin = new Client();
check("bad password rejected", (await new Client().login("customer1@demo.com", "wrong")) === null);
const cu = await customer.login("customer1@demo.com");
check("customer login has role", cu?.role === "CUSTOMER", JSON.stringify(cu));
await customer2.login("customer2@demo.com");
await owner.login("owner1@demo.com");
await owner2.login("owner2@demo.com");
await admin.login("admin@demo.com");

// --- route protection ---
let r = await anon.req("/dashboard/customer");
check("anon -> /dashboard redirects to login", r.status === 307 && r.headers.get("location")?.includes("/login"), r.status);
r = await customer.req("/dashboard/owner");
check("customer blocked from owner dashboard", r.status === 307 && r.headers.get("location")?.includes("/dashboard/customer"), `${r.status} ${r.headers.get("location")}`);
r = await owner.req("/dashboard/admin");
check("owner blocked from admin dashboard", r.status === 307, r.status);
check("customer can view own dashboard", (await customer.req("/dashboard/customer")).status === 200);
check("admin can view admin dashboard", (await admin.req("/dashboard/admin")).status === 200);

// --- API authorization ---
r = await anon.json("POST", "/api/hotels", {});
check("anon POST /api/hotels = 401", r.status === 401, r.status);
r = await customer.json("POST", "/api/hotels", {});
check("customer POST /api/hotels = 403", r.status === 403, r.status);
r = await owner.json("PATCH", "/api/admin/hotels/x", { status: "APPROVED" });
check("owner cannot use admin API = 403", r.status === 403, r.status);

// --- owner registers hotel (starts PENDING, hidden) ---
const name = `E2E Hotel ${Date.now()}`;
r = await owner.json("POST", "/api/hotels", {
  name, description: "A hotel created by the e2e test.", city: "Testville", country: "Nowhere",
  address: "1 Test St", starRating: 4, amenities: ["WiFi", "Pool"], imageUrls: ["https://picsum.photos/seed/e2e/800/600"],
});
check("owner creates hotel", r.status === 201, JSON.stringify(r));
const hotelId = r.body.id;
r = await owner.json("POST", `/api/hotels/${hotelId}/rooms`, { name: "Solo Room", description: "", capacity: 2, pricePerNight: 100, quantity: 1, amenities: [] });
check("owner adds room type (qty 1)", r.status === 201, JSON.stringify(r));
const roomId = r.body.id;
r = await owner.json("POST", "/api/hotels", { name: "x" });
check("invalid hotel payload = 400", r.status === 400, r.status);

let html = await (await anon.req("/search?destination=Testville")).text();
check("PENDING hotel hidden from search", !html.includes(name));
check("PENDING hotel page 404 for anon", (await anon.req(`/hotels/${hotelId}`)).status === 404);
r = await owner2.json("PUT", `/api/hotels/${hotelId}`, { name: "hijack" });
check("other owner cannot edit hotel = 403", r.status === 403, r.status);
r = await owner2.json("POST", `/api/hotels/${hotelId}/rooms`, { name: "Sneaky", capacity: 1, pricePerNight: 1, quantity: 1 });
check("other owner cannot add rooms = 403", r.status === 403, r.status);

// --- booking blocked while pending ---
const ci = day(30), co = day(33);
r = await customer.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: ci, checkOut: co, guests: 2, cardNumber: "4242 4242 4242 4242" });
check("cannot book unapproved hotel", r.status === 404, JSON.stringify(r));

// --- admin approves ---
r = await admin.json("PATCH", `/api/admin/hotels/${hotelId}`, { status: "APPROVED" });
check("admin approves hotel", r.status === 200, JSON.stringify(r));
html = await (await anon.req(`/search?destination=Testville&checkIn=${ci}&checkOut=${co}&guests=2`)).text();
check("approved hotel appears in search for free dates", html.includes(name));

// --- optional map location ---
const locBase = { name: `Loc Hotel ${Date.now()}`, description: "A hotel to test locations.", city: "Locville", country: "Nowhere", address: "1 Map St", starRating: 3, amenities: [], imageUrls: [] };
r = await owner.json("POST", "/api/hotels", { ...locBase, latitude: 95, longitude: 10 });
check("latitude out of range = 400", r.status === 400, JSON.stringify(r));
r = await owner.json("POST", "/api/hotels", { ...locBase, latitude: 48.8, longitude: "" });
check("only one coordinate = 400", r.status === 400 && /both latitude and longitude/i.test(r.body.error), JSON.stringify(r));
r = await owner.json("POST", "/api/hotels", { ...locBase, latitude: "48.8606", longitude: "2.3376" });
check("hotel with a location is created (201)", r.status === 201, JSON.stringify(r));
const locId = r.body.id;
await admin.json("PATCH", `/api/admin/hotels/${locId}`, { status: "APPROVED" });
html = await (await anon.req(`/hotels/${locId}`)).text();
check("public page embeds the OpenStreetMap map when a location is set", html.includes("openstreetmap.org/export/embed.html") && html.includes("marker=48.8606"), "no embed");
r = await owner.json("PUT", `/api/hotels/${locId}`, { ...locBase, latitude: "", longitude: "" });
check("PUT with empty coordinates clears the location", r.status === 200, JSON.stringify(r));
html = await (await anon.req(`/hotels/${locId}`)).text();
check("public page has no map once the location is cleared", !html.includes("openstreetmap.org/export/embed.html"));
r = await owner.json("PUT", `/api/hotels/${locId}`, { ...locBase, latitude: 40.7656, longitude: -73.9818 });
check("PUT can set the location again", r.status === 200, JSON.stringify(r));
r = await owner2.json("PUT", `/api/hotels/${locId}`, { ...locBase, latitude: 1, longitude: 1 });
check("another owner cannot change the location = 403", r.status === 403, r.status);

// --- optional nearby attractions ---
const place = { name: "Test Tower", category: "Landmark", description: "A tower for testing", latitude: 40.7589, longitude: -73.9851 };
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, place);
check("owner adds a nearby attraction (201)", r.status === 201, JSON.stringify(r));
const placeId = r.body.id;
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, category: "Casino" });
check("unknown category = 400", r.status === 400, JSON.stringify(r));
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, latitude: "", longitude: "" });
check("missing pin = 400 (never saved at 0,0)", r.status === 400 && /pin on the map/i.test(r.body.error), JSON.stringify(r));
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, latitude: 120 });
check("latitude out of range = 400", r.status === 400, JSON.stringify(r));
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, description: "x".repeat(301) });
check("over-long note = 400", r.status === 400, JSON.stringify(r));
r = await owner2.json("POST", `/api/hotels/${locId}/attractions`, place);
check("another owner cannot add attractions = 403", r.status === 403, r.status);
r = await owner2.json("PUT", `/api/attractions/${placeId}`, { ...place, name: "Hijacked" });
check("another owner cannot edit an attraction = 403", r.status === 403, r.status);
r = await owner2.json("DELETE", `/api/attractions/${placeId}`);
check("another owner cannot delete an attraction = 403", r.status === 403, r.status);
r = await anon.json("POST", `/api/hotels/${locId}/attractions`, place);
check("anonymous cannot add attractions = 401", r.status === 401, r.status);
html = await (await anon.req(`/hotels/${locId}`)).text();
const listed = { name: html.includes("Test Tower"), item: html.includes("nearby-item"), distance: /(\d+(\.\d)? km|\d+ m)(<!-- -->)? straight line/.test(html) };
check("public page lists the attraction and its distance", listed.name && listed.item && listed.distance, JSON.stringify(listed));
r = await owner.json("PUT", `/api/attractions/${placeId}`, { ...place, name: "Renamed Tower" });
check("owner edits an attraction", r.status === 200, JSON.stringify(r));
html = await (await anon.req(`/hotels/${locId}`)).text();
check("public page shows the new name", html.includes("Renamed Tower") && !html.includes("Test Tower"));
const xss = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, name: "<img src=x onerror=alert(1)>", description: "<script>alert(1)</script>" });
html = await (await anon.req(`/hotels/${locId}`)).text();
check("owner-entered HTML is escaped on the public page", xss.status === 201 && !html.includes("<img src=x") && !html.includes("<script>alert(1)</script>"), "unescaped");
await owner.json("DELETE", `/api/attractions/${xss.body.id}`);
let filled = 0;
for (let i = 0; i < 12; i++) {
  const rr = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, name: `Filler ${i}` });
  if (rr.status === 201) filled++;
}
r = await owner.json("POST", `/api/hotels/${locId}/attractions`, { ...place, name: "One too many" });
check("limit of 12 nearby places per hotel (the 13th is rejected)", filled === 11 && r.status === 400 && /up to 12/.test(r.body.error), `${filled} ${JSON.stringify(r)}`);
r = await owner.json("DELETE", `/api/attractions/${placeId}`);
check("owner deletes an attraction", r.status === 200, JSON.stringify(r));
html = await (await anon.req(`/hotels/${locId}`)).text();
check("deleted attraction disappears from the public page", !html.includes("Renamed Tower"));

// --- booking & inventory ---
r = await owner.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: ci, checkOut: co, guests: 2, cardNumber: "4242 4242 4242 4242" });
check("owner cannot book (customers only) = 403", r.status === 403, r.status);
r = await customer.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: day(-2), checkOut: co, guests: 2, cardNumber: "4242 4242 4242 4242" });
check("past check-in rejected", r.status === 400, JSON.stringify(r));
r = await customer.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: ci, checkOut: co, guests: 5, cardNumber: "4242 4242 4242 4242" });
check("over-capacity rejected", r.status === 400, JSON.stringify(r));
r = await customer.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: ci, checkOut: co, guests: 2, cardNumber: "4242 4242 4242 4242" });
check("customer books last room", r.status === 201, JSON.stringify(r));
const bookingId = r.body.id;
r = await customer2.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: day(31), checkOut: day(32), guests: 1, cardNumber: "4242 4242 4242 4242" });
check("overlapping booking rejected (409)", r.status === 409, JSON.stringify(r));
html = await (await anon.req(`/search?destination=Testville&checkIn=${ci}&checkOut=${co}&guests=2`)).text();
check("sold-out hotel leaves search for those dates", !html.includes(name));
r = await customer2.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: co, checkOut: day(35), guests: 1, cardNumber: "4242 4242 4242 4242" });
check("same-day turnover allowed", r.status === 201, JSON.stringify(r));

// --- race: 2 simultaneous bookings for 1 room ---
const [a, b] = await Promise.all([
  customer.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: day(60), checkOut: day(62), guests: 1, cardNumber: "4242 4242 4242 4242" }),
  customer2.json("POST", "/api/bookings", { roomTypeId: roomId, checkIn: day(60), checkOut: day(62), guests: 1, cardNumber: "4242 4242 4242 4242" }),
]);
check("concurrent booking: exactly one wins", [a.status, b.status].sort().join() === "201,409", `${a.status},${b.status}`);

// --- cancellation ---
r = await customer2.json("POST", `/api/bookings/${bookingId}/cancel`);
check("other customer cannot cancel = 403", r.status === 403, r.status);
r = await owner2.json("POST", `/api/bookings/${bookingId}/cancel`);
check("unrelated owner cannot cancel = 403", r.status === 403, r.status);
r = await customer.json("POST", `/api/bookings/${bookingId}/cancel`);
check("customer cancels own booking", r.status === 200, JSON.stringify(r));
r = await customer.json("POST", `/api/bookings/${bookingId}/cancel`);
check("double cancel = 409", r.status === 409, r.status);
html = await (await anon.req(`/search?destination=Testville&checkIn=${ci}&checkOut=${co}&guests=2`)).text();
check("cancellation frees inventory", html.includes(name));

// --- reviews ---
r = await customer.json("POST", "/api/reviews", { bookingId, rating: 5, comment: "Great" });
check("cannot review cancelled/future stay", r.status === 409, JSON.stringify(r));

// --- deactivated user loses API access ---
const victim = new Client();
r = await victim.json("POST", "/api/register", { name: "Temp User", email: `temp${Date.now()}@demo.com`, password: "password123", role: "CUSTOMER" });
check("register works", r.status === 201, JSON.stringify(r));
r = await anon.json("POST", "/api/register", { name: "Dup", email: "admin@demo.com", password: "password123", role: "ADMIN" });
check("cannot register as ADMIN / duplicate email", r.status === 400 || r.status === 409, r.status);

// --- delete guard ---
r = await owner.json("DELETE", `/api/hotels/${hotelId}`);
check("cannot delete hotel with upcoming bookings = 409", r.status === 409, JSON.stringify(r));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
