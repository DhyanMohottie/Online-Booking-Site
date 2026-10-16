/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  CalendarSearch,
  Check,
  ExternalLink,
  Flame,
  ImageOff,
  Info,
  MapPin,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getHotelDetail, parseStay } from "@/lib/search";
import { amenitiesFromString } from "@/lib/validators";
import { calcTotal, formatPrice, nightsBetween, toDayString, todayUTC } from "@/lib/availability";
import { distanceKm, formatDistance } from "@/lib/geo";
import { routesView } from "@/lib/routing/view";
import { AMENITY_ICONS } from "@/components/amenityIcons";
import NearbyMap, { type NearbyPlace } from "@/components/NearbyMap";
import { formatDate, ScoreBadge, scoreLabel, SectionHeading, Stars } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

/** Grid classes per photo count so the mosaic never leaves an empty cell. */
function galleryLayout(n: number): { grid: string; tiles: string[] } {
  switch (n) {
    case 1:
      return { grid: "grid-cols-1", tiles: [""] };
    case 2:
      return { grid: "grid-cols-2", tiles: ["", ""] };
    case 3:
      return { grid: "grid-cols-4 grid-rows-2", tiles: ["col-span-2 row-span-2", "col-span-2", "col-span-2"] };
    case 4:
      return { grid: "grid-cols-4 grid-rows-2", tiles: ["col-span-2 row-span-2", "", "", "col-span-2"] };
    default:
      return { grid: "grid-cols-4 grid-rows-2", tiles: ["col-span-2 row-span-2", "", "", "", ""] };
  }
}

function Gallery({ images, name }: { images: { id: string; url: string }[]; name: string }) {
  const shown = images.slice(0, 5);
  if (shown.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-[#2b3340] to-[#556070] text-white/70 md:h-[28rem]">
        <ImageOff size={32} aria-hidden="true" />
        <p>No photos yet</p>
      </div>
    );
  }
  const { grid, tiles } = galleryLayout(shown.length);
  return (
    <div className={`grid h-72 gap-3 md:h-[28rem] ${grid}`}>
      {shown.map((img, i) => (
        <div key={img.id} className={`group overflow-hidden rounded-xl bg-gray-200 ${tiles[i]}`}>
          <img
            src={img.url}
            alt={`${name} photo ${i + 1}`}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}

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
  const score = hotel.avgRating === null ? null : hotel.avgRating * 2;
  const fromPrice = hotel.roomTypes[0]?.pricePerNight ?? null; // rooms are already sorted by price
  const stayQuery = stay
    ? `?checkIn=${toDayString(stay.checkIn)}&checkOut=${toDayString(stay.checkOut)}&guests=${guests}`
    : "";

  // Optional owner-provided location: OpenStreetMap embed + link (no map library needed here).
  const { latitude, longitude } = hotel;
  const mapEmbed =
    latitude !== null && longitude !== null
      ? `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({
          bbox: `${longitude - 0.006},${latitude - 0.0036},${longitude + 0.006},${latitude + 0.0036}`,
          layer: "mapnik",
          marker: `${latitude},${longitude}`,
        }).toString()}`
      : null;
  const mapLink = mapEmbed ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}` : null;

  // Optional nearby attractions (owner-entered); saved road routes (when calculated) and straight-line distances from the hotel pin.
  const hotelPin = latitude !== null && longitude !== null ? { latitude, longitude } : null;
  const places: NearbyPlace[] = hotel.attractions.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    description: a.description,
    latitude: a.latitude,
    longitude: a.longitude,
    distance: hotelPin ? formatDistance(distanceKm(hotelPin, a)) : null,
    routes: routesView(a.routes),
  }));

  return (
    <div className="space-y-8">
      {hotel.status !== "APPROVED" && (
        <p className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-amber-200">
          <TriangleAlert size={20} className="shrink-0" aria-hidden="true" />
          <span>
            This hotel is <strong>{hotel.status}</strong> and not visible to the public.
          </span>
        </p>
      )}

      {/* Header */}
      <section className="space-y-5">
        <Link
          href={`/search${stayQuery}`}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:text-brand"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to search
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl leading-tight text-ink">{hotel.name}</h1>
            <p className="text-lg">
              <Stars count={hotel.starRating} />
            </p>
            <p className="flex items-center gap-1.5 text-base text-gray-600">
              <MapPin size={18} className="shrink-0 text-brand" aria-hidden="true" />
              {hotel.address}, {hotel.city}, {hotel.country}
            </p>
          </div>
          {score !== null ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold leading-tight text-ink">{scoreLabel(score)}</p>
                <p className="text-sm text-gray-500">
                  {hotel.reviews.length} review{hotel.reviews.length === 1 ? "" : "s"}
                </p>
              </div>
              <ScoreBadge score={score} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-ink">New</span> · No reviews yet
            </p>
          )}
        </div>

        <Gallery images={hotel.images} name={hotel.name} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        {/* Booking panel: first on phones, sticky on the right from lg up */}
        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="card space-y-5 p-6">
            {fromPrice !== null && (
              <div>
                <p className="text-sm text-gray-500">From</p>
                <p className="font-heading text-4xl font-medium leading-tight text-brand">
                  {formatPrice(fromPrice)} <span className="font-sans text-base font-normal text-gray-500">/ night</span>
                </p>
              </div>
            )}
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div>
                  <label className="field-label" htmlFor="checkIn">Check-in</label>
                  <input id="checkIn" type="date" name="checkIn" min={min} defaultValue={sp.checkIn} className="field" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="checkOut">Check-out</label>
                  <input id="checkOut" type="date" name="checkOut" min={min} defaultValue={sp.checkOut} className="field" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="guests">Guests</label>
                  <input id="guests" type="number" name="guests" min={1} max={20} defaultValue={guests} className="field" />
                </div>
              </div>
              <button className="btn h-12 w-full gap-2 px-5 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg">
                <CalendarSearch size={16} aria-hidden="true" /> Check availability
              </button>
            </form>
            {stay && (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand">
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} className="shrink-0" aria-hidden="true" />
                  {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}
                </span>
                <span className="mt-0.5 block pl-6 font-normal">
                  {nights} night{nights === 1 ? "" : "s"}
                </span>
              </p>
            )}
            <ul className="space-y-2.5 border-t border-gray-100 pt-5 text-sm text-gray-600">
              <li className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="shrink-0 text-green-600" aria-hidden="true" />
                Free cancellation before check-in
              </li>
              <li className="flex items-center gap-2.5">
                <CalendarCheck size={18} className="shrink-0 text-green-600" aria-hidden="true" />
                No real payment is taken in this demo
              </li>
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
          {/* About */}
          <section>
            <SectionHeading icon={Info} title="About this property" />
            <p className="whitespace-pre-line text-lg leading-relaxed text-gray-700">{hotel.description}</p>
          </section>

          {/* Amenities */}
          <section>
            <SectionHeading icon={Sparkles} title="Amenities" subtitle="What this place offers." />
            {amenities.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenities.map((a) => {
                  const Icon = AMENITY_ICONS[a] ?? Check;
                  return (
                    <li key={a} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="font-medium text-ink">{a}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500">None listed</p>
            )}
          </section>

          {/* Rooms */}
          <section id="rooms" className="space-y-4">
            <SectionHeading icon={BedDouble} title="Rooms & availability" subtitle="Choose your room and reserve it in a few clicks." />

            {!stay && (sp.checkIn || sp.checkOut) && (
              <p role="alert" className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-amber-200">
                <TriangleAlert size={18} className="shrink-0" aria-hidden="true" />
                Please pick valid future dates (check-out after check-in).
              </p>
            )}
            {!stay && (
              <p className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-gray-600 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
                <CalendarSearch size={18} className="shrink-0 text-brand" aria-hidden="true" />
                Choose dates to see which rooms are available and the total price.
              </p>
            )}

            <div className="space-y-4">
              {hotel.roomTypes.length === 0 && <p className="text-gray-500">No rooms listed yet.</p>}
              {hotel.roomTypes.map((room) => {
                const fits = room.capacity >= guests;
                const soldOut = stay !== null && room.left < 1;
                const canBook = stay !== null && !soldOut && fits && hotel.status === "APPROVED";
                return (
                  <article key={room.id} className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                        <BedDouble size={22} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 space-y-2.5">
                        <h3 className="font-heading text-xl font-medium uppercase leading-tight text-ink">{room.name}</h3>
                        {room.description && <p className="text-gray-600">{room.description}</p>}
                        <ul className="flex flex-wrap gap-2" aria-label="Room details">
                          <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                            <Users size={15} className="text-gray-500" aria-hidden="true" />
                            Sleeps {room.capacity}
                          </li>
                          <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                            <Tag size={15} className="text-gray-500" aria-hidden="true" />
                            {formatPrice(room.pricePerNight)} / night
                          </li>
                        </ul>
                        {stay && !soldOut && room.left <= 3 && (
                          <p className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
                            <Flame size={15} aria-hidden="true" /> Only {room.left} left at this price!
                          </p>
                        )}
                        {soldOut && (
                          <p className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
                            Sold out for these dates
                          </p>
                        )}
                        {!fits && (
                          <p className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                            Too small for {guests} guests
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:w-60 md:shrink-0 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                      {stay ? (
                        <div className="md:text-right">
                          <p className="font-heading text-3xl font-medium leading-tight text-brand">
                            {formatPrice(calcTotal(room.pricePerNight, stay.checkIn, stay.checkOut))}
                          </p>
                          <p className="text-sm text-gray-500">
                            for {nights} night{nights === 1 ? "" : "s"}
                          </p>
                        </div>
                      ) : (
                        <div className="md:text-right">
                          <p className="text-sm text-gray-500">per night</p>
                          <p className="font-heading text-3xl font-medium leading-tight text-brand">{formatPrice(room.pricePerNight)}</p>
                        </div>
                      )}
                      {canBook ? (
                        <Link href={`/book/${room.id}${stayQuery}`} className="btn h-12 w-full gap-2 px-5 text-sm">
                          Reserve <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      ) : (
                        <button className="btn h-12 w-full px-5 text-sm" disabled>
                          {stay ? "Unavailable" : "Select dates"}
                        </button>
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

          {/* Location with nearby attractions: interactive map + numbered list */}
          {places.length > 0 && (
            <section id="location" className="scroll-mt-6">
              <SectionHeading icon={MapPinned} title="Location & nearby attractions" subtitle={`${hotel.address}, ${hotel.city}, ${hotel.country}`} />
              <NearbyMap hotelName={hotel.name} hotel={hotelPin} places={places} />
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-outline mt-4 h-11 w-fit gap-2 px-5 text-sm">
                  Open the hotel in OpenStreetMap <ExternalLink size={15} aria-hidden="true" />
                </a>
              )}
            </section>
          )}

          {/* Location only (no attractions): lightweight OpenStreetMap embed */}
          {places.length === 0 && mapEmbed && mapLink && (
            <section id="location" className="scroll-mt-6">
              <SectionHeading icon={MapPinned} title="Location" subtitle={`${hotel.address}, ${hotel.city}, ${hotel.country}`} />
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                <iframe
                  title={`Map showing the location of ${hotel.name}`}
                  src={mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block h-80 w-full border-0 md:h-96"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm text-gray-500">Map data &copy; OpenStreetMap contributors</p>
                  <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-outline h-11 gap-2 px-5 text-sm">
                    Open in OpenStreetMap <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Reviews */}
          <section>
            <SectionHeading
              icon={MessageSquareText}
              title="Guest reviews"
              subtitle={
                score !== null
                  ? `${score.toFixed(1)} · ${scoreLabel(score)} · ${hotel.reviews.length} review${hotel.reviews.length === 1 ? "" : "s"}`
                  : "No reviews yet"
              }
            />
            {hotel.reviews.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/60 p-8 text-center text-gray-500">
                No reviews yet. Guests can review after their stay.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {hotel.reviews.map((r) => (
                  <article key={r.id} className="card space-y-3 p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand">
                        {r.user.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{r.user.name}</p>
                        <p className="text-sm text-gray-400">{formatDate(r.createdAt)}</p>
                      </div>
                      <Stars count={r.rating} />
                    </div>
                    <p className="text-gray-700">{r.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
