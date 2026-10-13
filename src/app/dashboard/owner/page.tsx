/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BedDouble, Building2, CalendarCheck, DoorOpen, Eye, MapPin, Plus, Settings2, Trash2, Wallet } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { EmptyState, StatCard, Stars } from "@/components/ui";

export const metadata = { title: "Manage hotels - StayFinder" };

const STATUS: Record<string, { label: string; className: string; hint?: string }> = {
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800" },
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800", hint: "Awaiting admin approval - not visible in search yet." },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700", hint: "Rejected by an admin. Edit the hotel and save to resubmit." },
};

export default async function OwnerDashboard() {
  const user = await requireRole("OWNER");
  const hotels = await prisma.hotel.findMany({
    where: { ownerId: user.id },
    include: {
      roomTypes: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const bookings = await prisma.booking.findMany({
    where: { roomType: { hotel: { ownerId: user.id } }, status: "CONFIRMED" },
    select: { totalPrice: true, checkOut: true },
  });
  const revenue = bookings.reduce((s, b) => s + b.totalPrice, 0);
  const upcoming = bookings.filter((b) => b.checkOut > new Date()).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-ink">Manage your hotels</h1>
          <p className="mt-1 text-gray-500">
            {hotels.length} hotel{hotels.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/dashboard/owner/hotels/new" className="btn px-6 py-3 text-sm">
          <Plus size={16} aria-hidden="true" /> Register a hotel
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hotels" value={hotels.length} icon={Building2} />
        <StatCard label="Active & upcoming bookings" value={upcoming} icon={CalendarCheck} />
        <StatCard label="Booked revenue (mock)" value={formatPrice(revenue)} icon={Wallet} />
      </div>

      {hotels.length === 0 ? (
        <EmptyState
          title="You have not registered a hotel yet"
          hint="New hotels are reviewed by an admin before appearing in search."
          href="/dashboard/owner/hotels/new"
          cta="Register your first hotel"
        />
      ) : (
        <div className="space-y-5">
          {hotels.map((h) => {
            const status = STATUS[h.status] ?? { label: h.status, className: "bg-gray-100 text-gray-700" };
            const image = h.images[0]?.url;
            const totalRooms = h.roomTypes.reduce((s, r) => s + r.quantity, 0);

            return (
              <article
                key={h.id}
                className="group relative flex flex-col gap-4 rounded-xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)] md:flex-row md:gap-6"
              >
                <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden rounded-md bg-gray-200 md:aspect-auto md:min-h-48 md:w-72 lg:w-80">
                  {image && (
                    <img
                      src={image}
                      alt={h.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ring-1 ring-white/70 ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 px-1 md:px-0 md:py-2">
                  <div className="space-y-1.5">
                    {/* Stretched link makes the whole card open the manage page; actions sit above it. */}
                    <Link
                      href={`/dashboard/owner/hotels/${h.id}`}
                      className="block font-heading text-2xl font-medium uppercase leading-tight text-ink transition after:absolute after:inset-0 group-hover:text-brand"
                    >
                      {h.name}
                    </Link>
                    <p className="text-base">
                      <Stars count={h.starRating} />
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin size={16} className="shrink-0 text-brand" aria-hidden="true" />
                      {h.city}, {h.country}
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2" aria-label="Inventory">
                    <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                      <BedDouble size={15} className="text-gray-500" aria-hidden="true" />
                      {h.roomTypes.length} room type{h.roomTypes.length === 1 ? "" : "s"}
                    </li>
                    <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                      <DoorOpen size={15} className="text-gray-500" aria-hidden="true" />
                      {totalRooms} room{totalRooms === 1 ? "" : "s"} total
                    </li>
                  </ul>
                  {status.hint && <p className="text-sm text-gray-500">{status.hint}</p>}
                </div>

                {/* Actions: equal-size, roomy buttons above the stretched link */}
                <div className="relative z-10 flex flex-col gap-3 border-t border-gray-100 px-1 pt-4 md:w-60 md:justify-center md:border-l md:border-t-0 md:px-0 md:py-2 md:pl-6 md:pt-2">
                  <Link href={`/dashboard/owner/hotels/${h.id}`} className="btn h-12 w-full gap-2 px-5 text-sm shadow-md shadow-brand/20 hover:-translate-y-px hover:shadow-lg">
                    <Settings2 size={16} aria-hidden="true" /> Manage
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href={`/hotels/${h.id}`} className="btn-outline h-12 w-full gap-2 px-4 text-sm">
                      <Eye size={16} aria-hidden="true" /> Preview
                    </Link>
                    <ActionButton
                      url={`/api/hotels/${h.id}`}
                      method="DELETE"
                      label="Delete"
                      icon={<Trash2 size={16} aria-hidden="true" />}
                      className="btn-danger h-12"
                      size="md"
                      fullWidth
                      confirm={`Delete ${h.name} and all its rooms and reviews?`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
