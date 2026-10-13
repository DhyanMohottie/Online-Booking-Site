import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/authz";
import { bookingSchema } from "@/lib/validators";
import { calcTotal, parseDay, roomsLeft, todayUTC } from "@/lib/availability";

export const POST = handle(async (req: Request) => {
  const user = await requireRole("CUSTOMER");
  const parsed = bookingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { roomTypeId, guests } = parsed.data;

  const checkIn = parseDay(parsed.data.checkIn);
  const checkOut = parseDay(parsed.data.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
  }
  if (checkIn < todayUTC()) return NextResponse.json({ error: "Check-in cannot be in the past" }, { status: 400 });

  // Re-check availability and insert atomically so two guests cannot take the last room.
  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.roomType.findUnique({ where: { id: roomTypeId }, include: { hotel: true } });
    if (!room || room.hotel.status !== "APPROVED") return { error: "This room is not available", status: 404 };
    if (guests > room.capacity) return { error: `This room fits at most ${room.capacity} guests`, status: 400 };

    const overlapping = await tx.booking.findMany({
      where: { roomTypeId, status: "CONFIRMED", checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
      select: { checkIn: true, checkOut: true, status: true },
    });
    if (roomsLeft(room.quantity, { checkIn, checkOut }, overlapping) < 1) {
      return { error: "Sorry, this room was just booked for those dates", status: 409 };
    }

    const booking = await tx.booking.create({
      data: {
        userId: user.id,
        roomTypeId,
        checkIn,
        checkOut,
        guests,
        totalPrice: calcTotal(room.pricePerNight, checkIn, checkOut),
        status: "CONFIRMED",
        paymentStatus: "MOCK_PAID", // no real payment is taken in this demo
      },
    });
    return { id: booking.id };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
});
