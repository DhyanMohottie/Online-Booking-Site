import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireHotelAccess } from "@/lib/authz";
import { attractionSchema, MAX_ATTRACTIONS } from "@/lib/validators";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireHotelAccess(id);
  const parsed = attractionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const count = await prisma.attraction.count({ where: { hotelId: id } });
  if (count >= MAX_ATTRACTIONS) {
    return NextResponse.json({ error: `You can list up to ${MAX_ATTRACTIONS} nearby places per hotel.` }, { status: 400 });
  }

  const place = await prisma.attraction.create({ data: { ...parsed.data, hotelId: id } });
  return NextResponse.json({ id: place.id }, { status: 201 });
});
