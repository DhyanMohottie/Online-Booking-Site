import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireHotelAccess } from "@/lib/authz";
import { computeRoutes } from "@/lib/routing/route";
import { RoutingError } from "@/lib/routing/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Per-hotel cool-down so one owner cannot hammer the public Overpass servers. */
const COOLDOWN_MS = 4000;
const lastRun = new Map<string, number>();

/**
 * Owner-triggered: download the OpenStreetMap roads around the hotel, run A* and Dijkstra for walking and
 * driving to every nearby place (or just `placeId`), and store the results. Guests only ever read them.
 */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { hotel } = await requireHotelAccess(id);

  let placeId: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.placeId === "string") placeId = body.placeId;
  } catch {
    /* no body = all places */
  }

  if (hotel.latitude == null || hotel.longitude == null) {
    return NextResponse.json({ error: "Set the hotel's map location first, then calculate road distances." }, { status: 400 });
  }

  const wait = (lastRun.get(id) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) {
    return NextResponse.json(
      { error: "Road distances were just calculated. Please wait a few seconds and try again.", retryAfter: Math.ceil(wait / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)) } },
    );
  }

  const places = await prisma.attraction.findMany({ where: { hotelId: id, ...(placeId ? { id: placeId } : {}) } });
  if (placeId && places.length === 0) return NextResponse.json({ error: "Place not found" }, { status: 404 });
  if (places.length === 0) return NextResponse.json({ updated: 0, failed: 0, reasons: {} });

  lastRun.set(id, Date.now());
  let results;
  try {
    results = await computeRoutes(
      { lat: hotel.latitude, lng: hotel.longitude },
      places.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude })),
    );
  } catch (err) {
    if (err instanceof RoutingError) {
      lastRun.delete(id);
      return NextResponse.json({ error: err.message }, { status: err.code === "too_large" ? 422 : 502 });
    }
    throw err;
  }

  let updated = 0;
  let failed = 0;
  const reasons: Record<string, { walk?: string; drive?: string }> = {};
  const now = new Date();
  await prisma.$transaction(
    places.map((p) => {
      const r = results.get(p.id);
      if (r && (r.walk || r.drive)) updated++;
      else failed++;
      if (r && (!r.walk || !r.drive)) reasons[p.id] = { walk: r.walkReason, drive: r.driveReason };
      return prisma.attraction.update({
        where: { id: p.id },
        data: { routes: r ? JSON.stringify(r) : null, routesAt: now },
      });
    }),
  );
  return NextResponse.json({ updated, failed, reasons });
});
