import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";

export const metadata = { title: "Manage hotels - StayFinder" };

export default async function OwnerDashboard() {
  const user = await requireRole("OWNER");
  const hotels = await prisma.hotel.findMany({
    where: { ownerId: user.id },
    include: { roomTypes: true, _count: { select: { reviews: true } } },
    orderBy: { createdAt: "desc" },
  });
  const bookings = await prisma.booking.findMany({
    where: { roomType: { hotel: { ownerId: user.id } }, status: "CONFIRMED" },
    select: { totalPrice: true, checkOut: true },
  });
  const revenue = bookings.reduce((s, b) => s + b.totalPrice, 0);
  const upcoming = bookings.filter((b) => b.checkOut > new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Manage your hotels</h1>
        <Link href="/dashboard/owner/hotels/new" className="btn">+ Register a hotel</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hotels" value={hotels.length} />
        <StatCard label="Active & upcoming bookings" value={upcoming} />
        <StatCard label="Booked revenue (mock)" value={formatPrice(revenue)} />
      </div>

      {hotels.length === 0 ? (
        <EmptyState
          title="You have not registered a hotel yet"
          hint="New hotels are reviewed by an admin before appearing in search."
          href="/dashboard/owner/hotels/new"
          cta="Register your first hotel"
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hotel</th>
                <th>Status</th>
                <th>Room types</th>
                <th>Total rooms</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id}>
                  <td>
                    <p className="font-semibold">{h.name}</p>
                    <p className="text-xs text-gray-500">{h.city}, {h.country}</p>
                  </td>
                  <td><StatusBadge status={h.status} /></td>
                  <td>{h.roomTypes.length}</td>
                  <td>{h.roomTypes.reduce((s, r) => s + r.quantity, 0)}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/owner/hotels/${h.id}`} className="btn-outline !px-3 !py-1.5">Manage</Link>
                      <Link href={`/hotels/${h.id}`} className="text-sm text-brand hover:underline">Preview</Link>
                      <ActionButton
                        url={`/api/hotels/${h.id}`}
                        method="DELETE"
                        label="Delete"
                        className="btn-danger"
                        confirm={`Delete ${h.name} and all its rooms and reviews?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
