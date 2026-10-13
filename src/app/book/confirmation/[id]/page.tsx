import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/availability";
import { formatDate } from "@/components/ui";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { roomType: { include: { hotel: true } } },
  });
  if (!booking || booking.userId !== session?.user.id) notFound();
  const { roomType } = booking;

  return (
    <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
      <h1 className="text-2xl font-extrabold">Booking confirmed!</h1>
      <p className="text-sm text-gray-500">Reference: {booking.id}</p>
      <div className="space-y-1 rounded-lg bg-gray-50 p-4 text-left text-sm">
        <p className="font-bold">{roomType.hotel.name}</p>
        <p>{roomType.name} · {booking.guests} guest{booking.guests === 1 ? "" : "s"}</p>
        <p>{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</p>
        <p className="font-semibold">Total: {formatPrice(booking.totalPrice)} (mock payment)</p>
      </div>
      <Link href="/dashboard/customer" className="btn">View my bookings</Link>
    </div>
  );
}
