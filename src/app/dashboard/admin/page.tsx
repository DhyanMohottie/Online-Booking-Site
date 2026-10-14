/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  ClipboardCheck,
  Eye,
  MapPin,
  UserCheck,
  UserX,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatPrice, nightsBetween, todayUTC } from "@/lib/availability";
import { ActionButton } from "@/components/forms";
import { formatDate, HOTEL_STATUS, SectionHeading, Stars } from "@/components/ui";
import { getStage, STAGE } from "@/components/bookingStage";

export const metadata = { title: "Admin - StayFinder" };

const ROLE_PILL: Record<string, { label: string; className: string }> = {
  CUSTOMER: { label: "Customer", className: "bg-gray-100 text-gray-700" },
  OWNER: { label: "Owner", className: "bg-amber-100 text-amber-800" },
  ADMIN: { label: "Admin", className: "bg-ink text-white" },
};

const HOTEL_ROW = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_5rem_22rem]";
const BOOKING_ROW = "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_7rem_9rem]";

function Avatar({ name, size = "h-11 w-11" }: { name: string; size?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand ${size}`}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  segments,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  segments?: { value: number; className: string }[];
}) {
  const total = segments?.reduce((s, x) => s + x.value, 0) ?? 0;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="font-heading text-3xl font-medium leading-tight text-ink">{value}</p>
        </div>
      </div>
      {segments && total > 0 && (
        <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span key={s.className} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
        </div>
      )}
      <p className="mt-3 text-sm text-gray-500">{hint}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const admin = await requireRole("ADMIN");
  const now = new Date();
  const today = todayUTC();

  const [hotels, users, bookings, confirmed, upcoming] = await Promise.all([
    prisma.hotel.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { roomTypes: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({
      include: {
        user: { select: { name: true } },
        roomType: { select: { name: true, hotel: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.booking.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    prisma.booking.count({ where: { status: "CONFIRMED", checkOut: { gt: now } } }),
  ]);

  const pending = hotels.filter((h) => h.status === "PENDING");
  const approvedCount = hotels.filter((h) => h.status === "APPROVED").length;
  const rejectedCount = hotels.filter((h) => h.status === "REJECTED").length;
  const customers = users.filter((u) => u.role === "CUSTOMER").length;
  const owners = users.filter((u) => u.role === "OWNER").length;
  const admins = users.filter((u) => u.role === "ADMIN").length;
  const firstName = (admin.name ?? "").trim().split(" ")[0] || "admin";

  const NAV = [
    { href: "#approvals", label: "Approvals", badge: pending.length },
    { href: "#hotels", label: "Hotels" },
    { href: "#users", label: "Users" },
    { href: "#bookings", label: "Bookings" },
  ];

  return (
    <div className="space-y-12">
      {/* Welcome banner */}
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-ink to-[#2b3340] px-8 py-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.22)] md:flex md:items-center md:justify-between md:gap-8 md:px-12">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-widest text-red-300">Admin</p>
            <h1 className="mt-2 text-4xl md:text-5xl">Admin dashboard</h1>
            <p className="mt-3 max-w-xl text-base text-white/75">
              Welcome back, {firstName}. Here is what is happening on StayFinder.
            </p>
          </div>
          <div className="relative mt-8 rounded-xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur md:mt-0 md:min-w-72">
            {pending.length > 0 ? (
              <>
                <p className="font-heading text-5xl leading-none">{pending.length}</p>
                <p className="mt-2 text-white/80">hotel{pending.length === 1 ? "" : "s"} waiting for approval</p>
                <a
                  href="#approvals"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-brand transition hover:bg-gray-50"
                >
                  Review now <ArrowRight size={16} aria-hidden="true" />
                </a>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <CircleCheck size={32} className="shrink-0 text-green-300" aria-hidden="true" />
                <div>
                  <p className="font-semibold">All caught up</p>
                  <p className="text-sm text-white/75">No hotels waiting for review.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:text-brand"
            >
              {n.label}
              {n.badge ? <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{n.badge}</span> : null}
            </a>
          ))}
        </nav>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Users"
          value={users.length}
          hint={`${customers} customer${customers === 1 ? "" : "s"} · ${owners} owner${owners === 1 ? "" : "s"} · ${admins} admin${admins === 1 ? "" : "s"}`}
          segments={[
            { value: customers, className: "bg-brand" },
            { value: owners, className: "bg-amber-400" },
            { value: admins, className: "bg-ink" },
          ]}
        />
        <Kpi
          icon={Building2}
          label="Hotels"
          value={hotels.length}
          hint={`${approvedCount} approved · ${pending.length} pending · ${rejectedCount} rejected`}
          segments={[
            { value: approvedCount, className: "bg-green-500" },
            { value: pending.length, className: "bg-amber-400" },
            { value: rejectedCount, className: "bg-red-500" },
          ]}
        />
        <Kpi icon={CalendarCheck} label="Confirmed bookings" value={confirmed._count._all} hint={`${upcoming} active or upcoming`} />
        <Kpi
          icon={Wallet}
          label="Booked revenue (mock)"
          value={formatPrice(confirmed._sum.totalPrice ?? 0)}
          hint={`from ${confirmed._count._all} confirmed booking${confirmed._count._all === 1 ? "" : "s"}`}
        />
      </div>

      {/* Pending approval */}
      <section id="approvals" className="scroll-mt-6">
        <SectionHeading
          icon={ClipboardCheck}
          title="Pending approval"
          subtitle={pending.length === 0 ? "Nothing waiting for review." : `${pending.length} hotel${pending.length === 1 ? "" : "s"} waiting for your decision.`}
        />
        {pending.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CircleCheck size={28} aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-ink">All caught up</p>
            <p className="text-gray-500">New hotels from owners will appear here for approval.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {pending.map((h) => (
              <article key={h.id} className="card flex flex-col gap-4 p-3 md:flex-row md:gap-6">
                <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden rounded-md bg-gray-200 md:aspect-auto md:min-h-44 md:w-64">
                  {h.images[0] && <img src={h.images[0].url} alt={h.name} className="h-full w-full object-cover" />}
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold shadow-sm ring-1 ring-white/70 ${HOTEL_STATUS.PENDING.className}`}>
                    {HOTEL_STATUS.PENDING.label}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-1 md:px-0 md:py-2">
                  <div className="space-y-1.5">
                    <Link href={`/hotels/${h.id}`} className="block font-heading text-2xl font-medium uppercase leading-tight text-ink transition hover:text-brand">
                      {h.name}
                    </Link>
                    <p className="text-base">
                      <Stars count={h.starRating} />
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin size={16} className="shrink-0 text-brand" aria-hidden="true" />
                      {h.city}, {h.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar name={h.owner.name} size="h-10 w-10" />
                    <p className="min-w-0 text-sm">
                      <span className="block truncate font-semibold text-ink">Owner: {h.owner.name}</span>
                      <span className="block truncate text-gray-500">{h.owner.email}</span>
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2" aria-label="Details">
                    <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                      <BedDouble size={15} className="text-gray-500" aria-hidden="true" />
                      {h._count.roomTypes} room type{h._count.roomTypes === 1 ? "" : "s"}
                    </li>
                    <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                      <CalendarDays size={15} className="text-gray-500" aria-hidden="true" />
                      Submitted {formatDate(h.createdAt)}
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col justify-center gap-3 border-t border-gray-100 px-1 pb-1 pt-4 md:w-60 md:border-l md:border-t-0 md:px-0 md:py-2 md:pl-6 md:pt-2">
                  <ActionButton
                    url={`/api/admin/hotels/${h.id}`}
                    method="PATCH"
                    body={{ status: "APPROVED" }}
                    label="Approve"
                    icon={<Check size={16} aria-hidden="true" />}
                    className="btn h-12 shadow-md shadow-brand/20"
                    size="md"
                    fullWidth
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton
                      url={`/api/admin/hotels/${h.id}`}
                      method="PATCH"
                      body={{ status: "REJECTED" }}
                      label="Reject"
                      icon={<X size={16} aria-hidden="true" />}
                      className="btn-danger h-12"
                      size="md"
                      fullWidth
                    />
                    <Link href={`/hotels/${h.id}`} className="btn-outline h-12 w-full gap-2 px-4 text-sm">
                      <Eye size={16} aria-hidden="true" /> Preview
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* All hotels */}
      <section id="hotels" className="scroll-mt-6">
        <SectionHeading icon={Building2} title="All hotels" subtitle={`${hotels.length} on the platform`} />
        <div className="space-y-3">
          <div className={`hidden gap-4 px-5 text-xs font-bold uppercase tracking-wide text-gray-500 lg:grid ${HOTEL_ROW}`}>
            <span>Hotel</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Rooms</span>
            <span>Actions</span>
          </div>
          {hotels.map((h) => {
            const status = HOTEL_STATUS[h.status] ?? { label: h.status, className: "bg-gray-100 text-gray-700" };
            return (
              <article key={h.id} className={`card grid items-center gap-4 p-4 sm:px-5 ${HOTEL_ROW}`}>
                <div className="flex min-w-0 items-center gap-4">
                  <span className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-gray-200">
                    {h.images[0] && <img src={h.images[0].url} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/hotels/${h.id}`} className="block truncate font-semibold text-ink transition hover:text-brand">
                      {h.name}
                    </Link>
                    <p className="truncate text-sm text-gray-500">
                      {h.city}, {h.country}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={h.owner.name} size="h-9 w-9 text-sm" />
                  <span className="truncate text-gray-700">{h.owner.name}</span>
                </div>
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>{status.label}</span>
                </div>
                <p className="flex items-center gap-1.5 text-gray-700">
                  <BedDouble size={16} className="text-brand" aria-hidden="true" />
                  {h._count.roomTypes}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {h.status !== "APPROVED" && (
                    <ActionButton
                      url={`/api/admin/hotels/${h.id}`}
                      method="PATCH"
                      body={{ status: "APPROVED" }}
                      label="Approve"
                      icon={<Check size={16} aria-hidden="true" />}
                      className="btn-outline h-10"
                      size="md"
                    />
                  )}
                  {h.status !== "REJECTED" && (
                    <ActionButton
                      url={`/api/admin/hotels/${h.id}`}
                      method="PATCH"
                      body={{ status: "REJECTED" }}
                      label="Reject"
                      icon={<X size={16} aria-hidden="true" />}
                      className="btn-danger h-10"
                      size="md"
                    />
                  )}
                  <Link href={`/hotels/${h.id}`} aria-label={`Preview ${h.name}`} className="btn-outline h-10 w-10 shrink-0 px-0!">
                    <Eye size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Users */}
      <section id="users" className="scroll-mt-6">
        <SectionHeading icon={Users} title="Users" subtitle={`${users.length} accounts · enable or disable access`} />
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((u) => {
            const role = ROLE_PILL[u.role] ?? { label: u.role, className: "bg-gray-100 text-gray-700" };
            const self = u.id === admin.id;
            return (
              <article key={u.id} className={`card flex flex-wrap items-center gap-4 p-4 sm:px-5 ${u.active ? "" : "opacity-70"}`}>
                <Avatar name={u.name} size="h-12 w-12 text-lg" />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{u.name}</span>
                    {self && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand">You</span>}
                  </p>
                  <p className="truncate text-sm text-gray-500">{u.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${role.className}`}>{role.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      {u.active ? "Active" : "Disabled"}
                    </span>
                    <span className="text-xs text-gray-400">Joined {formatDate(u.createdAt)}</span>
                  </div>
                </div>
                {!self && (
                  <ActionButton
                    url={`/api/admin/users/${u.id}`}
                    method="PATCH"
                    body={{ active: !u.active }}
                    label={u.active ? "Disable" : "Enable"}
                    icon={u.active ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
                    className={`${u.active ? "btn-danger" : "btn-outline"} h-10`}
                    size="md"
                    confirm={u.active ? `Disable ${u.name}? They will be signed out of API access.` : undefined}
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Recent bookings */}
      <section id="bookings" className="scroll-mt-6">
        <SectionHeading icon={CalendarDays} title="Recent bookings" subtitle="The latest 25 reservations across all hotels." />
        <div className="space-y-3">
          <div className={`hidden gap-4 px-5 text-xs font-bold uppercase tracking-wide text-gray-500 md:grid ${BOOKING_ROW}`}>
            <span>Guest</span>
            <span>Hotel / room</span>
            <span>Dates</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {bookings.map((b) => {
            const stage = getStage(b, today);
            const nights = nightsBetween(b.checkIn, b.checkOut);
            return (
              <article key={b.id} className={`card grid items-center gap-4 p-4 sm:px-5 ${BOOKING_ROW}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={b.user.name} />
                  <p className="truncate font-semibold text-ink">{b.user.name}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{b.roomType.hotel.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-gray-500">
                    <BedDouble size={14} className="shrink-0 text-brand" aria-hidden="true" />
                    {b.roomType.name}
                  </p>
                </div>
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
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${STAGE[stage].className}`}>{STAGE[stage].label}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
