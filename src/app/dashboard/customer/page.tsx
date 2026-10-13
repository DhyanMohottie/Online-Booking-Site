/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, BedDouble, CalendarDays, MapPin, ShieldCheck, Undo2 } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice, nightsBetween, todayUTC } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { EmptyState, formatDate, Stars } from "@/components/ui";
import ReviewForm from "./ReviewForm";

export const metadata = { title: "My bookings - StayFinder" };

type Stage = "upcoming" | "inProgress" | "completed" | "cancelled";

const STAGE: Record<Stage, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-green-100 text-green-800" },
  inProgress: { label: "Staying now", className: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

export default async function CustomerDashboard() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: {
      roomType: { include: { hotel: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
      review: true,
    },
    orderBy: { checkIn: "desc" },
  });
  const today = todayUTC();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">My bookings</h1>
          <p className="mt-1 text-gray-500">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/search" className="btn px-6 py-3 text-sm">
          Book another stay <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" hint="Find a stay and make your first reservation." href="/search" cta="Search hotels" />
      ) : (
        <div className="space-y-5">
          {bookings.map((b) => {
            const upcoming = b.status === "CONFIRMED" && b.checkIn > today;
            const completed = b.status === "CONFIRMED" && b.checkOut <= today;
            const inProgress = b.status === "CONFIRMED" && !upcoming && !completed;
            const stage: Stage = b.status === "CANCELLED" ? "cancelled" : upcoming ? "upcoming" : completed ? "completed" : "inProgress";
            const hotel = b.roomType.hotel;
            const image = hotel.images[0]?.url;
            const nights = nightsBetween(b.checkIn, b.checkOut);
            const refunded = b.paymentStatus === "REFUNDED";
            const hasFooter = inProgress || (completed && !b.review) || Boolean(b.review);

            return (
              <article
                key={b.id}
                className="group relative rounded-xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                  <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden rounded-md bg-gray-200 md:aspect-auto md:min-h-48 md:w-72 lg:w-80">
                    {image && (
                      <img
                        src={image}
                        alt={hotel.name}
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${stage === "cancelled" ? "opacity-60 grayscale" : ""}`}
                      />
                    )}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ring-1 ring-white/70 ${STAGE[stage].className}`}>
                      {STAGE[stage].label}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 px-1 md:px-0 md:py-2">
                    <div className="space-y-1.5">
                      {/* Stretched link makes the whole card open the hotel; actions below sit above it. */}
                      <Link
                        href={`/hotels/${hotel.id}`}
                        className="block font-heading text-2xl font-medium uppercase leading-tight text-ink transition after:absolute after:inset-0 group-hover:text-brand"
                      >
                        {hotel.name}
                      </Link>
                      <p className="text-base">
                        <Stars count={hotel.starRating} />
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin size={16} className="shrink-0 text-brand" aria-hidden="true" />
                        {hotel.city}, {hotel.country}
                      </p>
                    </div>
                    <ul className="space-y-2 text-base text-gray-700">
                      <li className="flex items-center gap-2.5">
                        <BedDouble size={18} className="shrink-0 text-brand" aria-hidden="true" />
                        {b.roomType.name} · {b.guests} guest{b.guests === 1 ? "" : "s"}
                      </li>
                      <li className="flex flex-wrap items-center gap-x-2.5">
                        <CalendarDays size={18} className="shrink-0 text-brand" aria-hidden="true" />
                        <span>
                          {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                        </span>
                        <span className="text-gray-500">
                          · {nights} night{nights === 1 ? "" : "s"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-gray-100 px-1 pt-3 md:w-60 md:justify-between md:border-l md:border-t-0 md:px-0 md:py-2 md:pl-6 md:pt-2">
                    <div className="flex items-end justify-between gap-3 md:flex-col md:items-end md:gap-1">
                      <div className="md:text-right">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className={`font-heading text-3xl font-medium leading-tight ${stage === "cancelled" ? "text-gray-400 line-through" : "text-brand"}`}>
                          {formatPrice(b.totalPrice)}
                        </p>
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-gray-500">
                        {refunded ? <Undo2 size={16} aria-hidden="true" /> : <ShieldCheck size={16} className="text-green-600" aria-hidden="true" />}
                        {refunded ? "Refunded (mock)" : "Paid (mock)"}
                      </p>
                    </div>
                    {upcoming && (
                      <div className="relative z-10 md:flex md:justify-end">
                        <ActionButton
                          url={`/api/bookings/${b.id}/cancel`}
                          label="Cancel booking"
                          className="btn-danger"
                          confirm="Cancel this booking? The room will be released."
                        />
                      </div>
                    )}
                  </div>
                </div>

                {hasFooter && (
                  <div className="relative z-10 mt-4 border-t border-gray-100 px-1 pb-1 pt-4">
                    {inProgress && <p className="text-gray-500">Enjoy your stay! Review opens after check-out.</p>}
                    {completed && !b.review && <ReviewForm bookingId={b.id} />}
                    {b.review && (
                      <div className="rounded-xl bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-ink">Your review</span>
                          <Stars count={b.review.rating} />
                          <span className="text-sm text-gray-500">{b.review.rating}/5</span>
                        </div>
                        <p className="mt-1.5 text-gray-700">{b.review.comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
