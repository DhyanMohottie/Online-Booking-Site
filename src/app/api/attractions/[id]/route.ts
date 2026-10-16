import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, requireHotelAccess } from "@/lib/authz";
import { attractionSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/** Load the place and make sure the caller owns its hotel (or is an admin). */
async function placeWithAccess(id: string) {
  const place = await prisma.attraction.findUnique({ where: { id } });
  if (!place) throw new HttpError(404, "Place not found");
  await requireHotelAccess(place.hotelId);
  return place;
}

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  await placeWithAccess(id);
  const parsed = attractionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  await prisma.attraction.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await placeWithAccess(id);
  await prisma.attraction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
