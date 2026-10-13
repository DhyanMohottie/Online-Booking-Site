/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { HotelResult } from "@/lib/search";
import { Price, RatingBadge, Stars } from "./ui";

export default function HotelCard({ hotel, query }: { hotel: HotelResult; query: string }) {
  return (
    <article className="card flex flex-col overflow-hidden md:flex-row">
      <div className="h-48 w-full shrink-0 bg-gray-200 md:h-auto md:w-64">
        {hotel.image && <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row">
        <div className="space-y-1">
          <Link href={`/hotels/${hotel.id}${query}`} className="font-heading text-xl font-medium uppercase text-ink hover:text-brand">
            {hotel.name}
          </Link>
          <div className="text-sm">
            <Stars count={hotel.starRating} />
          </div>
          <p className="text-sm text-gray-600">
            {hotel.city}, {hotel.country}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {hotel.amenities.slice(0, 4).map((a) => (
              <span key={a} className="badge bg-brand-50 text-brand">
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-2 sm:items-end">
          <RatingBadge avg={hotel.avgRating} count={hotel.reviewCount} />
          <div className="sm:text-right">
            <p className="text-xs text-gray-500">from</p>
            <Price cents={hotel.fromPrice} suffix="/ night" />
            <Link href={`/hotels/${hotel.id}${query}`} className="btn mt-2 block">
              See availability
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compact vertical tile used in the home page "Top hotels" row. */
export function HotelTile({ hotel }: { hotel: HotelResult }) {
  return (
    <Link href={`/hotels/${hotel.id}`} className="group block">
      <div className="aspect-4/5 overflow-hidden bg-gray-200">
        {hotel.image && (
          <img
            src={hotel.image}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="space-y-1 pt-3 text-center">
        <p className="text-xs">
          <Stars count={hotel.starRating} />
          <span className="ml-1 text-gray-500">
            {hotel.reviewCount > 0 ? `· ${hotel.reviewCount} review${hotel.reviewCount === 1 ? "" : "s"}` : "· New"}
          </span>
        </p>
        <h3 className="font-heading text-base uppercase text-ink group-hover:text-brand">{hotel.name}</h3>
        <p className="text-xs text-gray-500">
          {hotel.city}, {hotel.country}
        </p>
        <Price cents={hotel.fromPrice} />
      </div>
    </Link>
  );
}
