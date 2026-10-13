import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { formatDate, StatCard, StatusBadge } from "@/components/ui";

export const metadata = { title: "Admin - StayFinder" };

export default async function AdminDashboard() {
  const admin = await requireRole("ADMIN");

  const [hotels, users, bookings] = await Promise.all([
    prisma.hotel.findMany({
      include: { owner: { select: { name: true, email: true } }, _count: { select: { roomTypes: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({
      include: {
        user: { select: { name: true } },
        roomType: { select: { name: true, hotel: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const confirmed = await prisma.booking.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { totalPrice: true },
    _count: { _all: true },
  });
  const pending = hotels.filter((h) => h.status === "PENDING");

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-extrabold">Admin dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Hotels" value={hotels.length} />
        <StatCard label="Confirmed bookings" value={confirmed._count._all} />
        <StatCard label="Booked revenue (mock)" value={formatPrice(confirmed._sum.totalPrice ?? 0)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pending approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-gray-500">Nothing waiting for review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((h) => (
              <div key={h.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/hotels/${h.id}`} className="font-bold text-brand hover:underline">{h.name}</Link>
                  <p className="text-sm text-gray-600">{h.city}, {h.country} · {h._count.roomTypes} room types</p>
                  <p className="text-xs text-gray-500">Owner: {h.owner.name} ({h.owner.email})</p>
                </div>
                <div className="flex gap-2">
                  <ActionButton url={`/api/admin/hotels/${h.id}`} method="PATCH" body={{ status: "APPROVED" }} label="Approve" className="btn" />
                  <ActionButton url={`/api/admin/hotels/${h.id}`} method="PATCH" body={{ status: "REJECTED" }} label="Reject" className="btn-danger" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">All hotels</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hotel</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/hotels/${h.id}`} className="font-semibold text-brand hover:underline">{h.name}</Link>
                    <p className="text-xs text-gray-500">{h.city}, {h.country}</p>
                  </td>
                  <td>{h.owner.name}</td>
                  <td><StatusBadge status={h.status} /></td>
                  <td>
                    <div className="flex gap-2">
                      {h.status !== "APPROVED" && (
                        <ActionButton url={`/api/admin/hotels/${h.id}`} method="PATCH" body={{ status: "APPROVED" }} label="Approve" />
                      )}
                      {h.status !== "REJECTED" && (
                        <ActionButton url={`/api/admin/hotels/${h.id}`} method="PATCH" body={{ status: "REJECTED" }} label="Reject" className="btn-danger" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Users</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.active ? "ACTIVE" : "DISABLED"} /></td>
                  <td>
                    {u.id !== admin.id && (
                      <ActionButton
                        url={`/api/admin/users/${u.id}`}
                        method="PATCH"
                        body={{ active: !u.active }}
                        label={u.active ? "Disable" : "Enable"}
                        className={u.active ? "btn-danger" : "btn-outline"}
                        confirm={u.active ? `Disable ${u.name}? They will be signed out of API access.` : undefined}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Recent bookings</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Guest</th><th>Hotel / room</th><th>Dates</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user.name}</td>
                  <td>
                    <p className="font-semibold">{b.roomType.hotel.name}</p>
                    <p className="text-xs text-gray-500">{b.roomType.name}</p>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                  <td>{formatPrice(b.totalPrice)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
