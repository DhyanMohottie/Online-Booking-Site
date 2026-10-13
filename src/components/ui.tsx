import Link from "next/link";
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

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

export function Price({ cents, suffix }: { cents: number; suffix?: string }) {
  return (
    <span>
      <span className="text-lg font-bold">{formatPrice(cents)}</span>
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

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
