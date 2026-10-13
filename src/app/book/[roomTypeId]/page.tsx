import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseStay } from "@/lib/search";
import { calcTotal, formatPrice, nightsBetween, roomsLeft } from "@/lib/availability";
import { formatDate } from "@/components/ui";
import BookingForm from "./BookingForm";

type Props = {
  params: Promise<{ roomTypeId: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const { roomTypeId } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (session?.user.role !== "CUSTOMER") {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">Only customer accounts can make reservations.</p>
        <Link href="/" className="btn mt-4">Back to search</Link>
      </div>
    );
  }

  const room = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    include: { hotel: true },
  });
  if (!room || room.hotel.status !== "APPROVED") notFound();

  const stay = parseStay(sp.checkIn, sp.checkOut);
  const hotelLink = `/hotels/${room.hotelId}`;
  if (!stay) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">Please choose valid dates first.</p>
        <Link href={hotelLink} className="btn mt-4">Pick dates</Link>
      </div>
    );
  }

  const overlapping = await prisma.booking.findMany({
    where: { roomTypeId, status: "CONFIRMED", checkIn: { lt: stay.checkOut }, checkOut: { gt: stay.checkIn } },
    select: { checkIn: true, checkOut: true, status: true },
  });
  if (roomsLeft(room.quantity, stay, overlapping) < 1) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">Sorry, this room is no longer available for those dates.</p>
        <Link href={`${hotelLink}?checkIn=${sp.checkIn}&checkOut=${sp.checkOut}`} className="btn mt-4">See other rooms</Link>
      </div>
    );
  }

  const guests = Math.min(room.capacity, Math.max(1, Number.parseInt(sp.guests ?? "2", 10) || 2));
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const total = calcTotal(room.pricePerNight, stay.checkIn, stay.checkOut);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Complete your booking</h1>
        <BookingForm
          roomTypeId={room.id}
          checkIn={sp.checkIn!}
          checkOut={sp.checkOut!}
          maxGuests={room.capacity}
          defaultGuests={guests}
          total={formatPrice(total)}
        />
      </div>
      <aside className="card h-fit space-y-2 p-4">
        <h2 className="font-bold">{room.hotel.name}</h2>
        <p className="text-sm text-gray-600">{room.hotel.city}, {room.hotel.country}</p>
        <hr />
        <p className="font-semibold">{room.name}</p>
        <p className="text-sm">Check-in: {formatDate(stay.checkIn)}</p>
        <p className="text-sm">Check-out: {formatDate(stay.checkOut)}</p>
        <hr />
        <p className="flex justify-between text-sm">
          <span>{formatPrice(room.pricePerNight)} x {nights} night{nights === 1 ? "" : "s"}</span>
          <span>{formatPrice(total)}</span>
        </p>
        <p className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </p>
        <p className="text-xs text-gray-500">Free cancellation before check-in.</p>
      </aside>
    </div>
  );
}
