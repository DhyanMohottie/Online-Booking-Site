import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/availability";
import { amenitiesFromString } from "@/lib/validators";
import HotelForm from "@/components/HotelForm";
import { ActionButton } from "@/components/forms";
import { formatDate, StatusBadge } from "@/components/ui";
import RoomManager from "./RoomManager";

export default async function ManageHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("OWNER");
  const hotel = await prisma.hotel.findFirst({
    where: { id, ownerId: user.id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      roomTypes: { orderBy: { pricePerNight: "asc" } },
    },
  });
  if (!hotel) notFound();

  const bookings = await prisma.booking.findMany({
    where: { roomType: { hotelId: id } },
    include: { user: { select: { name: true, email: true } }, roomType: { select: { name: true } } },
    orderBy: { checkIn: "desc" },
  });
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/owner" className="text-sm text-brand hover:underline">← Back to my hotels</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">{hotel.name}</h1>
          <StatusBadge status={hotel.status} />
        </div>
        {hotel.status === "PENDING" && <p className="text-sm text-yellow-800">Awaiting admin approval - not yet visible in search.</p>}
        {hotel.status === "REJECTED" && (
          <p className="text-sm text-red-700">Rejected by an admin. Edit your details and save to resubmit for approval.</p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Room types &amp; inventory</h2>
        <RoomManager
          hotelId={hotel.id}
          rooms={hotel.roomTypes.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            capacity: r.capacity,
            pricePerNight: r.pricePerNight / 100,
            quantity: r.quantity,
            amenities: amenitiesFromString(r.amenities),
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <p className="font-semibold">{b.user.name}</p>
                      <p className="text-xs text-gray-500">{b.user.email}</p>
                    </td>
                    <td>{b.roomType.name}</td>
                    <td className="whitespace-nowrap">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                    <td>{formatPrice(b.totalPrice)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      {b.status === "CONFIRMED" && b.checkOut > now && (
                        <ActionButton url={`/api/bookings/${b.id}/cancel`} label="Cancel" className="btn-danger" confirm="Cancel this guest's booking?" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Hotel details</h2>
        <HotelForm
          hotelId={hotel.id}
          initial={{
            name: hotel.name,
            description: hotel.description,
            city: hotel.city,
            country: hotel.country,
            address: hotel.address,
            starRating: hotel.starRating,
            amenities: amenitiesFromString(hotel.amenities),
            imageUrls: hotel.images.map((i) => i.url),
          }}
        />
      </section>
    </div>
  );
}
