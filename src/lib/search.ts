import { prisma } from "./prisma";
import { amenitiesFromString } from "./validators";
import { parseDay, roomsLeft, todayUTC, type DateRange } from "./availability";

export type SearchParams = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  minPrice?: string; // dollars
  maxPrice?: string; // dollars
  stars?: string;
  amenities?: string; // comma separated
  sort?: string;
  page?: string;
};

export const PAGE_SIZE = 6;

/** Validated stay dates from query params, or null when absent/invalid. */
export function parseStay(checkIn?: string, checkOut?: string): DateRange | null {
  const a = parseDay(checkIn);
  const b = parseDay(checkOut);
  if (!a || !b || b <= a || a < todayUTC()) return null;
  return { checkIn: a, checkOut: b };
}

export type HotelResult = {
  id: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  image: string | null;
  amenities: string[];
  avgRating: number | null;
  reviewCount: number;
  fromPrice: number; // cents per night
  roomsAvailable: number;
};

export async function searchHotels(params: SearchParams) {
  const stay = parseStay(params.checkIn, params.checkOut);
  const guests = Math.max(1, Number.parseInt(params.guests ?? "1", 10) || 1);
  const dest = params.destination?.trim();

  const hotels = await prisma.hotel.findMany({
    where: {
      status: "APPROVED",
      ...(dest
        ? { OR: [{ city: { contains: dest } }, { country: { contains: dest } }, { name: { contains: dest } }] }
        : {}),
      ...(params.stars ? { starRating: { gte: Number(params.stars) || 1 } } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      reviews: { select: { rating: true } },
      roomTypes: {
        include: {
          bookings: {
            where: stay
              ? { status: "CONFIRMED", checkIn: { lt: stay.checkOut }, checkOut: { gt: stay.checkIn } }
              : { id: "none" },
            select: { checkIn: true, checkOut: true, status: true },
          },
        },
      },
    },
  });

  const wantedAmenities = (params.amenities ?? "").split(",").filter(Boolean);
  const min = params.minPrice ? Number(params.minPrice) * 100 : 0;
  const max = params.maxPrice ? Number(params.maxPrice) * 100 : Number.POSITIVE_INFINITY;

  const results: HotelResult[] = [];
  for (const h of hotels) {
    const amenities = amenitiesFromString(h.amenities);
    if (!wantedAmenities.every((a) => amenities.includes(a))) continue;

    const fitting = h.roomTypes.filter((r) => {
      if (r.capacity < guests) return false;
      if (r.pricePerNight < min || r.pricePerNight > max) return false;
      return stay ? roomsLeft(r.quantity, stay, r.bookings) > 0 : true;
    });
    if (fitting.length === 0) continue;

    const ratings = h.reviews.map((r) => r.rating);
    results.push({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      starRating: h.starRating,
      image: h.images[0]?.url ?? null,
      amenities,
      avgRating: ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : null,
      reviewCount: ratings.length,
      fromPrice: Math.min(...fitting.map((r) => r.pricePerNight)),
      roomsAvailable: fitting.length,
    });
  }

  switch (params.sort) {
    case "price_asc":
      results.sort((a, b) => a.fromPrice - b.fromPrice);
      break;
    case "price_desc":
      results.sort((a, b) => b.fromPrice - a.fromPrice);
      break;
    case "stars":
      results.sort((a, b) => b.starRating - a.starRating);
      break;
    default:
      results.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.reviewCount - a.reviewCount);
  }

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return {
    total: results.length,
    page,
    pages: Math.max(1, Math.ceil(results.length / PAGE_SIZE)),
    items: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    stay,
    guests,
  };
}

/** Hotel with room availability for an optional stay. */
export async function getHotelDetail(id: string, stay: DateRange | null) {
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { name: true } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      roomTypes: {
        include: {
          bookings: {
            where: stay
              ? { status: "CONFIRMED", checkIn: { lt: stay.checkOut }, checkOut: { gt: stay.checkIn } }
              : { id: "none" },
            select: { checkIn: true, checkOut: true, status: true },
          },
        },
        orderBy: { pricePerNight: "asc" },
      },
    },
  });
  if (!hotel) return null;
  const ratings = hotel.reviews.map((r) => r.rating);
  return {
    ...hotel,
    avgRating: ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : null,
    roomTypes: hotel.roomTypes.map((r) => ({
      ...r,
      left: stay ? roomsLeft(r.quantity, stay, r.bookings) : r.quantity,
    })),
  };
}
