import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireHotelAccess } from "@/lib/authz";
import { amenitiesToString, hotelSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { user, hotel } = await requireHotelAccess(id);
  const parsed = hotelSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { imageUrls, amenities, ...data } = parsed.data;

  const pinMoved = (data.latitude ?? null) !== hotel.latitude || (data.longitude ?? null) !== hotel.longitude;

  await prisma.$transaction([
    // Saved road routes start at the hotel pin, so they are stale once it moves.
    ...(pinMoved ? [prisma.attraction.updateMany({ where: { hotelId: id }, data: { routes: null, routesAt: null } })] : []),
    prisma.hotelImage.deleteMany({ where: { hotelId: id } }),
    prisma.hotel.update({
      where: { id },
      data: {
        ...data,
        // Explicit null so an owner can clear a previously saved location.
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        amenities: amenitiesToString(amenities),
        // An owner's edit sends a previously rejected hotel back for review.
        ...(user.role === "OWNER" && hotel.status === "REJECTED" ? { status: "PENDING" } : {}),
        images: { create: imageUrls.map((url, i) => ({ url, sortOrder: i })) },
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireHotelAccess(id);
  const upcoming = await prisma.booking.count({
    where: { roomType: { hotelId: id }, status: "CONFIRMED", checkOut: { gt: new Date() } },
  });
  if (upcoming > 0) {
    return NextResponse.json(
      { error: "This hotel has active or upcoming bookings. Cancel them before deleting." },
      { status: 409 },
    );
  }
  await prisma.hotel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
