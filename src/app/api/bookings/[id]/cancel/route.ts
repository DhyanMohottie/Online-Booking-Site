import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, requireRole } from "@/lib/authz";
import { todayUTC } from "@/lib/availability";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireRole("CUSTOMER", "OWNER", "ADMIN");
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { roomType: { include: { hotel: { select: { ownerId: true } } } } },
  });
  if (!booking) throw new HttpError(404, "Booking not found");

  const allowed =
    user.role === "ADMIN" ||
    (user.role === "CUSTOMER" && booking.userId === user.id) ||
    (user.role === "OWNER" && booking.roomType.hotel.ownerId === user.id);
  if (!allowed) throw new HttpError(403, "You cannot cancel this booking");

  if (booking.status !== "CONFIRMED") throw new HttpError(409, "This booking is already cancelled");
  const today = todayUTC();
  // Guests can cancel only before check-in; hotels/admins until the stay ends.
  const cutoff = user.role === "CUSTOMER" ? booking.checkIn : booking.checkOut;
  if (cutoff <= today) throw new HttpError(409, "This stay has already started and can no longer be cancelled");

  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED", paymentStatus: "REFUNDED" } });
  return NextResponse.json({ ok: true });
});
