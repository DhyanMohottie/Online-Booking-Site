/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { HotelResult } from "@/lib/search";
import { AMENITY_ICONS } from "./amenityIcons";
import { Price, Stars } from "./ui";

/** Verbal label for a 0-10 guest score. */
function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 8) return "Excellent";
  if (score >= 7) return "Very good";
  if (score >= 6) return "Good";
  return "Pleasant";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="flex h-11 min-w-11 items-center justify-center rounded-md rounded-bl-none bg-brand px-2 text-base font-bold text-white">
      {score.toFixed(1)}
    </span>
  );
}

/** Amenity pills with icons: first `max`, then "+N more". */
function AmenityChips({ amenities, max }: { amenities: string[]; max: number }) {
  const shown = amenities.slice(0, max);
  const extra = amenities.length - shown.length;
  return (
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
  );
}

const CARD =
  "group relative flex flex-col gap-4 rounded-xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)]";
const TITLE =
  "block font-heading text-2xl font-medium uppercase leading-tight text-ink transition after:absolute after:inset-0 group-hover:text-brand";

export default function HotelCard({ hotel, query }: { hotel: HotelResult; query: string }) {
  const href = `/hotels/${hotel.id}${query}`;
  const score = hotel.avgRating === null ? null : hotel.avgRating * 2;

  return (
    <article className={`${CARD} md:flex-row md:gap-6`}>
      <div className="aspect-16/10 w-full shrink-0 overflow-hidden rounded-md bg-gray-200 md:aspect-auto md:min-h-52 md:w-72 lg:w-80">
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
          <Link href={href} className={TITLE}>
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
        <AmenityChips amenities={hotel.amenities} max={5} />
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
            <ScoreBadge score={score} />
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
          <Link href={href} className="btn relative z-10 whitespace-nowrap px-4 py-3 text-sm md:px-5">
            See availability <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Vertical version of the Hotels-page card, used in the home page "Top hotels" grid. */
export function HotelTile({ hotel }: { hotel: HotelResult }) {
  const href = `/hotels/${hotel.id}`;
  const score = hotel.avgRating === null ? null : hotel.avgRating * 2;

  return (
    <article className={CARD}>
      <div className="aspect-16/10 w-full overflow-hidden rounded-md bg-gray-200">
        {hotel.image && (
          <img
            src={hotel.image}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-1">
        <div className="space-y-1.5">
          <Link href={href} className={TITLE}>
            {hotel.name}
          </Link>
          <p className="text-lg">
            <Stars count={hotel.starRating} />
          </p>
          <p className="flex items-center gap-1.5 text-base text-gray-600">
            <MapPin size={18} className="shrink-0 text-brand" aria-hidden="true" />
            {hotel.city}, {hotel.country}
          </p>
        </div>
        <AmenityChips amenities={hotel.amenities} max={3} />
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-gray-100 px-1 pt-4">
        {score !== null ? (
          <div className="flex items-center gap-3">
            <ScoreBadge score={score} />
            <div>
              <p className="font-semibold leading-tight text-ink">{scoreLabel(score)}</p>
              <p className="text-sm text-gray-500">
                {hotel.reviewCount} review{hotel.reviewCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-ink">New</span> · No reviews yet
          </p>
        )}
        <div className="text-right">
          <p className="text-sm text-gray-500">from</p>
          <Price cents={hotel.fromPrice} suffix="/ night" />
        </div>
      </div>

      <Link href={href} className="btn relative z-10 w-full whitespace-nowrap px-5 py-3 text-sm">
        See availability <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
