# StayFinder - Hotel Booking Demo

A Booking.com-inspired full-stack demo: hotel registration, room inventory, date-based search,
reservations, reviews, authentication/authorization and role-based dashboards.
**Educational project - payments are simulated, no card data is processed or stored.**

**Stack:** Next.js 15 (App Router, TypeScript) · Prisma + SQLite · Auth.js (credentials + JWT) · Zod · Tailwind CSS · Vitest

## Run it

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET
npx prisma migrate dev        # creates prisma/dev.db
npm run db:seed               # demo data (re-runnable, wipes existing data)
npm run dev                   # http://localhost:3000
```

## Demo accounts (password: `password123`)

| Role | Email | What they can do |
|------|-------|------------------|
| Customer | customer1@demo.com (also 2, 3) | Search, book, cancel, review past stays |
| Hotel owner | owner1@demo.com, owner2@demo.com | Register hotels, manage room types/inventory, view & cancel guest bookings |
| Admin | admin@demo.com | Approve/reject hotels, enable/disable users, see all bookings and stats |

## Walkthrough

1. Sign in as **owner1** -> *Register a hotel* -> add room types (set how many rooms of each type exist).
   The hotel is `PENDING` and invisible to the public.
2. Sign in as **admin** -> *Pending approval* -> Approve.
3. Sign in as **customer1**, search a city with dates, open the hotel, reserve a room (mock payment).
4. Book the last room of a type: other customers now see it sold out for overlapping dates; cancelling releases it.
5. After check-out, the customer can leave one review per stay; the hotel's rating updates.
   Seed data already contains past stays so reviews can be tried straight away (customer3 has one to review).

## Hotel location (optional)

Owners can optionally pin their hotel on an **OpenStreetMap** map (Hotel details -> *Map location*): click the map or
drag the pin, type latitude/longitude, or press *Find from address*. *Open in OpenStreetMap* lets them verify the spot on
openstreetmap.org. When a location is set, guests see a *Location* section with the map on the hotel page; hotels
without one are unchanged.

- Stored as two nullable columns (`Hotel.latitude`, `Hotel.longitude`); both or neither must be set.
- The owner map uses [Leaflet](https://leafletjs.com) with OpenStreetMap tiles; *Find from address* calls the public
  Nominatim geocoder from the browser - fine for demos and light use, see the
  [usage policy](https://operations.osmfoundation.org/policies/nominatim/) before using it at scale.
- **Updating an existing database:** after pulling this change run `npx prisma migrate dev` (it only adds the two
  nullable columns and keeps your data). `npm run db:seed` adds demo coordinates to the seeded hotels.

### Nearby attractions (optional)

Owners can also list up to 12 **tourist attractions near their hotel** (Hotel details page -> *Nearby attractions*):
a name, a category (Landmark, Museum, Park & nature, Beach, Food & drink, ...), an optional short note and a pin on the
OpenStreetMap map (click/drag the pin, or *Find place by name*). The owner sees all places on an overview map. On the
public hotel page the hotel and its places appear on one OpenStreetMap map with a numbered list, straight-line
distances from the hotel, and *Open in OpenStreetMap* links; hotels without places are unchanged.

- Stored in a new `Attraction` table (`npx prisma migrate dev` creates it; no existing data is touched).
- Owner-entered text is always rendered as plain text (never as HTML) in map popups and lists.

### Real road distances (A* and Dijkstra)

Straight-line distance is only the fallback. When an owner saves a place (or presses *Calculate / Recalculate road
distances*) the server computes the **real walking and driving distance** from the hotel pin to each place:

1. It downloads the OpenStreetMap road network around the hotel and its places in one request to the
   [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (`src/lib/routing/overpass.ts`).
2. It builds a weighted graph per travel mode (`graph.ts`, `profiles.ts`): walking uses footpaths, pedestrian streets
   and ordinary roads (one-way rules ignored, motorways excluded); driving uses roads cars may use and respects one-way
   streets, roundabouts and access tags. Edge weight = metres.
3. The hotel and the place are **snapped onto the nearest road segment** (a virtual node is inserted, so distances are not
   rounded to the nearest junction). The final figure is door to door: pin to road + route + road to pin.
4. The shortest path is found with **both Dijkstra and A\*** (`dijkstra.ts`, `astar.ts`, own binary-heap priority queue).
   A\* orders nodes by distance travelled + straight-line distance still to go, which never over-estimates, so it returns
   the same optimal answer as Dijkstra while exploring far fewer roads. Both results and their explored-node counts
   are stored, and owners can open *How it was calculated* on each place to compare them.
5. Results are saved in `Attraction.routes` as JSON. **Guests never trigger routing**: the hotel page only reads the
   stored routes, shows a *Walk / Drive* toggle, the road distance (walking also gives an approximate time at 5 km/h),
   and draws the route as a dashed line when a place is chosen. Places without a route fall back to the straight line,
   clearly labelled. Moving the hotel or a place pin clears the affected routes.

Notes: the public Overpass servers are shared infrastructure - routing is owner-triggered, throttled (one run per hotel
every few seconds) and limited to places within 8 km. Set `OVERPASS_URL` to use your own Overpass instance (or the mock
below). Walking time is a simple average; there is no traffic model.

```bash
npm run mock:overpass      # offline Overpass look-alike serving a synthetic street grid (port 3199)
OVERPASS_URL=http://127.0.0.1:3199/api/interpreter npm start -- -p 3100
npm run test:routing       # then: 45 deterministic checks with known distances (one-way detours, footway shortcut, failures)
```

## How it works

- **Inventory model:** a hotel has *room types*, each with a `quantity` of physical rooms.
  Availability for a date range = `quantity - confirmed bookings overlapping the range`.
  Overlap is `existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn`,
  so same-day turnover is allowed. Logic lives in `src/lib/availability.ts` (unit-tested) and is reused by search,
  the hotel page and the booking API.
- **No double booking:** `POST /api/bookings` re-checks availability and inserts inside one `prisma.$transaction`
  (SQLite serialises writers). The e2e script fires two concurrent requests for the last room and asserts exactly one wins.
- **Authorization (defence in depth):**
  `src/middleware.ts` redirects by role for `/dashboard/*`; every API route calls `requireRole` / `requireHotelAccess`
  from `src/lib/authz.ts`, which also re-checks the user in the DB so disabled accounts lose access immediately.
  Owners can only touch their own hotels; customers can only cancel/review their own bookings.
- **Approval workflow:** new hotels start `PENDING`; only `APPROVED` hotels appear in search or accept bookings.
- **Money** is stored as integer cents. **Dates** are UTC calendar days (check-in/out at midnight UTC).
- SQLite has no enums, so roles/statuses are strings validated with Zod (`src/lib/validators.ts`).

## Project layout

```
prisma/            schema.prisma, seed.ts
src/app/           pages (search, hotels/[id], book/*, dashboard/{customer,owner,admin}, login, register)
src/app/api/       route handlers (register, hotels, rooms, bookings, reviews, admin)
src/lib/           availability, search, auth, authz, validators, prisma
src/components/    Header, SearchBar, HotelCard, HotelForm, forms (client helpers), ui
src/lib/routing/   road graph, Dijkstra, A*, Overpass client, route orchestration (unit-tested)
scripts/e2e.mjs    API-level end-to-end walkthrough (needs a running server)
scripts/e2e-routing.mjs, scripts/mock-overpass.mjs   road-distance integration test + offline Overpass mock
```

## Tests

```bash
npm test                                 # unit tests: availability / overlap / pricing
npm run build && npm start -- -p 3100    # then in another terminal:
npm run test:e2e                         # 37 checks: auth, role guards, booking, overbooking race, cancellation
```
(`BASE=http://localhost:3000 npm run test:e2e` to target the dev server. The e2e run creates data; re-run `npm run db:seed` to reset.)

## Known simplifications

- Hotel images are URLs (seed uses picsum.photos), not file uploads.
- Payment is a mock form; bookings are marked `MOCK_PAID`, cancellations `REFUNDED`.
- No email notifications, password reset or per-night pricing rules.
- SQLite is for zero-setup demos; switch the Prisma datasource to PostgreSQL for anything shared.
