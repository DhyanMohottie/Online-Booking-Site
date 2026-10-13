import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireHotelAccess } from "@/lib/authz";
import { amenitiesToString, roomTypeSchema } from "@/lib/validators";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireHotelAccess(id);
  const parsed = roomTypeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { pricePerNight, amenities, ...data } = parsed.data;

  const room = await prisma.roomType.create({
    data: { ...data, hotelId: id, pricePerNight: Math.round(pricePerNight * 100), amenities: amenitiesToString(amenities) },
  });
  return NextResponse.json({ id: room.id }, { status: 201 });
});
