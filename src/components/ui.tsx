import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/availability";

export function Stars({ count }: { count: number }) {
  return (
    <span className="text-accent" aria-label={`${count} stars`}>
      {"★".repeat(count)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - count))}</span>
    </span>
  );
}

export function RatingBadge({ avg, count }: { avg: number | null; count: number }) {
  if (avg === null) return <span className="text-xs text-gray-500">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="rounded-md rounded-bl-none bg-brand px-2 py-1 text-xs font-bold text-white">{(avg * 2).toFixed(1)}</span>
      <span className="text-gray-600">
        {avg.toFixed(1)} / 5 · {count} review{count === 1 ? "" : "s"}
      </span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
  ACTIVE: "bg-green-100 text-green-800",
  DISABLED: "bg-red-100 text-red-800",
};

/** Hotel approval status: pill label/colour and an optional one-line hint for the owner. */
export const HOTEL_STATUS: Record<string, { label: string; className: string; hint?: string }> = {
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800" },
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800", hint: "Awaiting admin approval - not visible in search yet." },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700", hint: "Rejected by an admin. Edit the hotel and save to resubmit." },
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

export function Price({ cents, suffix }: { cents: number; suffix?: string }) {
  return (
    <span>
      <span className="font-heading text-xl font-semibold text-brand">{formatPrice(cents)}</span>
      {suffix && <span className="text-xs text-gray-500"> {suffix}</span>}
    </span>
  );
}

export function EmptyState({ title, hint, href, cta }: { title: string; hint?: string; href?: string; cta?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      {href && cta && (
        <Link href={href} className="btn mt-4">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon?: LucideIcon }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      {Icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 font-heading text-3xl font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  );
}

/** Row of big numbers separated by thin dividers (home page stats card). */
export function StatsBar({ items }: { items: { value: string | number; label: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-6 rounded-xl bg-white px-4 py-8 shadow-[0_12px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 md:grid-cols-4 md:gap-y-0">
      {items.map((s) => (
        <div key={s.label} className="text-center md:border-r md:border-gray-200 md:last:border-r-0">
          <dd className="font-heading text-3xl font-normal text-ink">{s.value}</dd>
          <dt className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
