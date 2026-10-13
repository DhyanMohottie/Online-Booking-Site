/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHotelDetail, parseStay } from "@/lib/search";
import { amenitiesFromString } from "@/lib/validators";
import { calcTotal, formatPrice, nightsBetween, toDayString, todayUTC } from "@/lib/availability";
import { formatDate, RatingBadge, Stars } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

export default async function HotelPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const stay = parseStay(sp.checkIn, sp.checkOut);
  const guests = Math.max(1, Number.parseInt(sp.guests ?? "2", 10) || 2);

  const [hotel, session] = await Promise.all([getHotelDetail(id, stay), auth()]);
  if (!hotel) notFound();

  // Unapproved hotels are visible only to their owner and admins.
  const user = session?.user;
  if (hotel.status !== "APPROVED" && !(user && (user.role === "ADMIN" || user.id === hotel.ownerId))) notFound();

  const amenities = amenitiesFromString(hotel.amenities);
  const min = toDayString(todayUTC());
  const nights = stay ? nightsBetween(stay.checkIn, stay.checkOut) : 0;

  return (
    <div className="space-y-8">
      {hotel.status !== "APPROVED" && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          This hotel is <strong>{hotel.status}</strong> and not visible to the public.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{hotel.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <Stars count={hotel.starRating} />
              <span>
                {hotel.address}, {hotel.city}, {hotel.country}
              </span>
            </div>
          </div>
          <RatingBadge avg={hotel.avgRating} count={hotel.reviews.length} />
        </div>
        <div className="grid h-72 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:h-96">
          {hotel.images.slice(0, 5).map((img, i) => (
            <img
              key={img.id}
              src={img.url}
              alt={`${hotel.name} photo ${i + 1}`}
              className={`h-full w-full object-cover ${
                i === 0 ? "col-span-2 row-span-2" : i === 3 && hotel.images.length === 4 ? "col-span-2" : ""
              }`}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-lg font-bold">About this property</h2>
          <p className="whitespace-pre-line text-gray-700">{hotel.description}</p>
        </div>
        <div className="card h-fit p-4">
          <h2 className="mb-2 font-bold">Amenities</h2>
          <div className="flex flex-wrap gap-1">
            {amenities.length ? (
              amenities.map((a) => (
                <span key={a} className="badge bg-brand-50 text-brand">{a}</span>
              ))
            ) : (
              <span className="text-sm text-gray-500">None listed</span>
            )}
          </div>
        </div>
      </section>

      <section id="rooms" className="space-y-4">
        <h2 className="text-lg font-bold">Rooms &amp; availability</h2>
        <form className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label" htmlFor="checkIn">Check-in</label>
            <input id="checkIn" type="date" name="checkIn" min={min} defaultValue={sp.checkIn} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="checkOut">Check-out</label>
            <input id="checkOut" type="date" name="checkOut" min={min} defaultValue={sp.checkOut} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="guests">Guests</label>
            <input id="guests" type="number" name="guests" min={1} max={20} defaultValue={guests} className="input w-24" />
          </div>
          <button className="btn">Check availability</button>
        </form>

        {!stay && (sp.checkIn || sp.checkOut) && (
          <p role="alert" className="text-sm text-yellow-800">Please pick valid future dates (check-out after check-in).</p>
        )}
        {!stay && <p className="text-sm text-gray-500">Choose dates to see which rooms are available and the total price.</p>}

        <div className="space-y-3">
          {hotel.roomTypes.length === 0 && <p className="text-gray-500">No rooms listed yet.</p>}
          {hotel.roomTypes.map((room) => {
            const fits = room.capacity >= guests;
            const soldOut = stay !== null && room.left < 1;
            const canBook = stay !== null && !soldOut && fits && hotel.status === "APPROVED";
            const q = stay
              ? `?checkIn=${toDayString(stay.checkIn)}&checkOut=${toDayString(stay.checkOut)}&guests=${guests}`
              : "";
            return (
              <article key={room.id} className="card flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <h3 className="font-bold">{room.name}</h3>
                  <p className="text-sm text-gray-600">{room.description}</p>
                  <p className="text-sm text-gray-500">Sleeps {room.capacity}</p>
                  {stay && !soldOut && room.left <= 3 && (
                    <p className="text-sm font-semibold text-red-600">Only {room.left} left at this price!</p>
                  )}
                  {soldOut && <p className="text-sm font-semibold text-red-600">Sold out for these dates</p>}
                  {!fits && <p className="text-sm text-yellow-700">Too small for {guests} guests</p>}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-gray-500">{formatPrice(room.pricePerNight)} / night</p>
                  {stay && (
                    <p className="text-lg font-bold">
                      {formatPrice(calcTotal(room.pricePerNight, stay.checkIn, stay.checkOut))}
                      <span className="text-xs font-normal text-gray-500"> for {nights} night{nights === 1 ? "" : "s"}</span>
                    </p>
                  )}
                  {canBook ? (
                    <Link href={`/book/${room.id}${q}`} className="btn mt-2">Reserve</Link>
                  ) : (
                    <button className="btn mt-2" disabled>{stay ? "Unavailable" : "Select dates"}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {user && user.role !== "CUSTOMER" && (
          <p className="text-sm text-gray-500">Only customer accounts can make reservations.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Guest reviews</h2>
        {hotel.reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet. Guests can review after their stay.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {hotel.reviews.map((r) => (
              <article key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.user.name}</span>
                  <Stars count={r.rating} />
                </div>
                <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
                <p className="mt-2 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
