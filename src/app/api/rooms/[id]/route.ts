import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, requireHotelAccess } from "@/lib/authz";
import { amenitiesToString, roomTypeSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

async function roomWithAccess(id: string) {
  const room = await prisma.roomType.findUnique({ where: { id } });
  if (!room) throw new HttpError(404, "Room type not found");
  await requireHotelAccess(room.hotelId);
  return room;
}

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  await roomWithAccess(id);
  const parsed = roomTypeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { pricePerNight, amenities, ...data } = parsed.data;

  await prisma.roomType.update({
    where: { id },
    data: { ...data, pricePerNight: Math.round(pricePerNight * 100), amenities: amenitiesToString(amenities) },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await roomWithAccess(id);
  const upcoming = await prisma.booking.count({
    where: { roomTypeId: id, status: "CONFIRMED", checkOut: { gt: new Date() } },
  });
  if (upcoming > 0) {
    return NextResponse.json({ error: "This room type has active or upcoming bookings." }, { status: 409 });
  }
  await prisma.roomType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
