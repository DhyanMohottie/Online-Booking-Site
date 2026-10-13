import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/authz";
import { reviewSchema } from "@/lib/validators";
import { todayUTC } from "@/lib/availability";

export const POST = handle(async (req: Request) => {
  const user = await requireRole("CUSTOMER");
  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { roomType: { select: { hotelId: true } }, review: true },
  });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "CONFIRMED" || booking.checkOut > todayUTC()) {
    return NextResponse.json({ error: "You can review a stay after you have checked out" }, { status: 409 });
  }
  if (booking.review) return NextResponse.json({ error: "You already reviewed this stay" }, { status: 409 });

  await prisma.review.create({
    data: { bookingId, userId: user.id, hotelId: booking.roomType.hotelId, rating, comment },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});
