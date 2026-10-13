import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice, todayUTC } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { EmptyState, formatDate, StatusBadge } from "@/components/ui";
import ReviewForm from "./ReviewForm";

export const metadata = { title: "My bookings - StayFinder" };

export default async function CustomerDashboard() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { roomType: { include: { hotel: true } }, review: true },
    orderBy: { checkIn: "desc" },
  });
  const today = todayUTC();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My bookings</h1>
        <Link href="/search" className="btn">Book another stay</Link>
      </div>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" hint="Find a stay and make your first reservation." href="/search" cta="Search hotels" />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const upcoming = b.status === "CONFIRMED" && b.checkIn > today;
            const completed = b.status === "CONFIRMED" && b.checkOut <= today;
            const inProgress = b.status === "CONFIRMED" && !upcoming && !completed;
            return (
              <article key={b.id} className="card space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/hotels/${b.roomType.hotelId}`} className="text-lg font-bold text-brand hover:underline">
                      {b.roomType.hotel.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {b.roomType.name} · {b.guests} guest{b.guests === 1 ? "" : "s"} · {b.roomType.hotel.city}
                    </p>
                    <p className="text-sm">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <StatusBadge status={b.status} />
                    <p className="font-bold">{formatPrice(b.totalPrice)}</p>
                    <p className="text-xs text-gray-500">
                      {b.paymentStatus === "REFUNDED" ? "Refunded (mock)" : "Paid (mock)"}
                    </p>
                  </div>
                </div>
                {upcoming && (
                  <ActionButton
                    url={`/api/bookings/${b.id}/cancel`}
                    label="Cancel booking"
                    className="btn-danger"
                    confirm="Cancel this booking? The room will be released."
                  />
                )}
                {inProgress && <p className="text-sm text-gray-500">Enjoy your stay! Review opens after check-out.</p>}
                {completed && !b.review && <ReviewForm bookingId={b.id} />}
                {b.review && (
                  <p className="rounded-md bg-gray-50 p-3 text-sm">
                    <span className="font-semibold">Your review ({b.review.rating}/5):</span> {b.review.comment}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
