/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, CalendarCheck, CalendarDays, CalendarX, DoorOpen, Eye, MapPin, Settings2, X } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice, nightsBetween, todayUTC } from "@/lib/availability";
import { amenitiesFromString } from "@/lib/validators";
import HotelForm from "@/components/HotelForm";
import { ActionButton } from "@/components/forms";
import { formatDate, HOTEL_STATUS, SectionHeading as SectionHead, Stars } from "@/components/ui";
import { getStage, STAGE } from "@/components/bookingStage";
import RoomManager from "./RoomManager";

const ROW_GRID = "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_7rem_13rem]";

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
  const today = todayUTC();

  const status = HOTEL_STATUS[hotel.status] ?? { label: hotel.status, className: "bg-gray-100 text-gray-700" };
  const totalRooms = hotel.roomTypes.reduce((s, r) => s + r.quantity, 0);
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const cover = hotel.images[0]?.url;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/owner"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:text-brand"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to my hotels
        </Link>

        <section className="card flex flex-col gap-5 p-3 md:flex-row md:gap-6">
          <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden rounded-md bg-gray-200 md:aspect-auto md:min-h-44 md:w-72 lg:w-80">
            {cover && <img src={cover} alt={hotel.name} className="h-full w-full object-cover" />}
            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ring-1 ring-white/70 ${status.className}`}>
              {status.label}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-1 pb-2 md:px-0 md:py-3">
            <h1 className="text-3xl leading-tight text-ink">{hotel.name}</h1>
            <p className="text-base">
              <Stars count={hotel.starRating} />
            </p>
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin size={16} className="shrink-0 text-brand" aria-hidden="true" />
              {hotel.address}, {hotel.city}, {hotel.country}
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Overview">
              <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                <BedDouble size={15} className="text-gray-500" aria-hidden="true" />
                {hotel.roomTypes.length} room type{hotel.roomTypes.length === 1 ? "" : "s"}
              </li>
              <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                <DoorOpen size={15} className="text-gray-500" aria-hidden="true" />
                {totalRooms} room{totalRooms === 1 ? "" : "s"} total
              </li>
              <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                <CalendarCheck size={15} className="text-gray-500" aria-hidden="true" />
                {confirmed} booking{confirmed === 1 ? "" : "s"}
              </li>
            </ul>
            {status.hint && <p className="text-sm text-gray-500">{status.hint}</p>}
          </div>

          <div className="flex flex-col justify-center gap-3 border-t border-gray-100 px-1 pb-2 pt-4 md:w-64 md:border-l md:border-t-0 md:px-0 md:py-3 md:pl-6">
            <Link href={`/hotels/${hotel.id}`} className="btn-outline h-12 w-full gap-2 whitespace-nowrap px-5 text-sm">
              <Eye size={16} aria-hidden="true" /> Preview public page
            </Link>
          </div>
        </section>
      </div>

      {/* Room types */}
      <section>
        <SectionHead icon={BedDouble} title="Room types & inventory" subtitle="Set prices and how many rooms of each type you offer." />
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

      {/* Bookings */}
      <section>
        <SectionHead
          icon={CalendarDays}
          title="Bookings"
          subtitle={`${bookings.length} total · ${bookings.filter((b) => b.status === "CONFIRMED" && b.checkIn > today).length} upcoming`}
        />
        {bookings.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CalendarX size={26} aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-ink">No bookings yet</p>
            <p className="text-gray-500">Reservations from guests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`hidden gap-4 px-5 text-xs font-bold uppercase tracking-wide text-gray-500 md:grid ${ROW_GRID}`}>
              <span>Guest</span>
              <span>Room</span>
              <span>Dates</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {bookings.map((b) => {
              const stage = getStage(b, today);
              const nights = nightsBetween(b.checkIn, b.checkOut);
              const cancellable = b.status === "CONFIRMED" && b.checkOut > now;
              return (
                <article key={b.id} className={`card grid items-center gap-4 p-4 sm:px-5 ${ROW_GRID}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand">
                      {b.user.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{b.user.name}</p>
                      <p className="truncate text-sm text-gray-500">{b.user.email}</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-gray-700">
                    <BedDouble size={16} className="shrink-0 text-brand" aria-hidden="true" />
                    {b.roomType.name}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-gray-700">
                    <CalendarDays size={16} className="shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                    </span>
                    <span className="text-sm text-gray-500">
                      · {nights} night{nights === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className={`font-heading text-xl font-medium ${stage === "cancelled" ? "text-gray-400 line-through" : "text-brand"}`}>
                    {formatPrice(b.totalPrice)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-start md:gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STAGE[stage].className}`}>{STAGE[stage].label}</span>
                    {cancellable && (
                      <ActionButton
                        url={`/api/bookings/${b.id}/cancel`}
                        label="Cancel booking"
                        icon={<X size={16} aria-hidden="true" />}
                        className="btn-danger h-10 whitespace-nowrap"
                        size="md"
                        confirm="Cancel this guest's booking?"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Hotel details */}
      <section>
        <SectionHead icon={Settings2} title="Hotel details" subtitle="Update how your hotel appears in search and on its page." />
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
