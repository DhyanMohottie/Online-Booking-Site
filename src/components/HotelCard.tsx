/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { HotelResult } from "@/lib/search";
import { AMENITY_ICONS } from "./amenityIcons";
import { Price, Stars } from "./ui";

const MAX_CHIPS = 5;

/** Verbal label for a 0-10 guest score. */
function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 8) return "Excellent";
  if (score >= 7) return "Very good";
  if (score >= 6) return "Good";
  return "Pleasant";
}

export default function HotelCard({ hotel, query }: { hotel: HotelResult; query: string }) {
  const href = `/hotels/${hotel.id}${query}`;
  const score = hotel.avgRating === null ? null : hotel.avgRating * 2;
  const shown = hotel.amenities.slice(0, MAX_CHIPS);
  const extra = hotel.amenities.length - shown.length;

  return (
    <article className="group relative flex flex-col gap-4 rounded-[14px] bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)] md:flex-row md:gap-6">
      <div className="aspect-16/10 w-full shrink-0 overflow-hidden rounded-[10px] bg-gray-200 md:aspect-auto md:min-h-52 md:w-72 lg:w-80">
        {hotel.image && (
          <img
            src={hotel.image}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-1 md:px-0 md:py-2">
        <div className="space-y-1.5">
          {/* Stretched link makes the whole card clickable; the CTA below sits above it. */}
          <Link
            href={href}
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
        <ul className="flex flex-wrap gap-2" aria-label="Amenities">
          {shown.map((a) => {
            const Icon = AMENITY_ICONS[a];
            return (
              <li key={a} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                {Icon && <Icon size={15} className="text-gray-500" aria-hidden="true" />}
                {a}
              </li>
            );
          })}
          {extra > 0 && <li className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">+{extra} more</li>}
        </ul>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 px-1 pt-3 md:w-64 md:justify-between md:border-l md:border-t-0 md:px-0 md:py-2 md:pl-6 md:pt-2">
        {score !== null ? (
          <div className="flex items-center gap-3 md:justify-end">
            <div className="md:text-right">
              <p className="font-semibold leading-tight text-ink">{scoreLabel(score)}</p>
              <p className="text-sm text-gray-500">
                {hotel.reviewCount} review{hotel.reviewCount === 1 ? "" : "s"}
              </p>
            </div>
            <span className="flex h-11 min-w-11 items-center justify-center rounded-[10px] rounded-bl-none bg-brand px-2 text-base font-bold text-white">
              {score.toFixed(1)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 md:text-right">
            <span className="font-semibold text-ink">New</span> · No reviews yet
          </p>
        )}
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-stretch md:gap-2">
          <div className="md:text-right">
            <p className="text-sm text-gray-500">from</p>
            <Price cents={hotel.fromPrice} suffix="/ night" />
          </div>
          <Link href={href} className="btn relative z-10 whitespace-nowrap rounded-[10px] px-4 py-3 text-sm md:px-5">
            See availability <ArrowRight size={16} aria-hidden="true" />
          </Link>
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
