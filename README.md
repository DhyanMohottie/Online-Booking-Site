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
scripts/e2e.mjs    API-level end-to-end walkthrough (needs a running server)
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
