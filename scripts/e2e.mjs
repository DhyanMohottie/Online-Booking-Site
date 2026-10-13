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
