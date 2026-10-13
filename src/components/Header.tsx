import { Power, UserRound } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import Logo from "./Logo";
import { HeaderFrame, NavLink } from "./HeaderFrame";

const DASHBOARD: Record<string, { href: string; label: string }> = {
  CUSTOMER: { href: "/dashboard/customer", label: "My bookings" },
  OWNER: { href: "/dashboard/owner", label: "Manage hotels" },
  ADMIN: { href: "/dashboard/admin", label: "Admin" },
};

export default async function Header() {
  const session = await auth();
  const user = session?.user;
  const dash = user ? DASHBOARD[user.role] : null;

  return (
    <HeaderFrame>
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 sm:px-6 lg:px-10">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/search">Hotels</NavLink>
          {user ? (
            <>
              {dash && <NavLink href={dash.href}>{dash.label}</NavLink>}
              <form
                className="group relative"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  aria-label="Log out"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 text-white transition hover:border-brand hover:bg-brand focus-visible:border-brand focus-visible:bg-brand focus-visible:outline-none"
                >
                  <Power size={20} aria-hidden="true" />
                </button>
                {/* Tooltip: shown on hover and keyboard focus. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-full z-40 mt-3 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink opacity-0 shadow-lg transition duration-150 before:absolute before:-top-1 before:left-1/2 before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-45 before:bg-white group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  Log Out
                </span>
              </form>
              {/* Signed-in user's name sits at the far right of the nav. */}
              <span className="flex max-w-56 items-center gap-2 text-base font-semibold text-white md:text-lg" title={user.name ?? undefined}>
                <UserRound size={22} className="shrink-0 text-brand" aria-hidden="true" />
                <span className="truncate">{user.name}</span>
              </span>
            </>
          ) : (
            <>
              <NavLink href="/register?role=OWNER" className="hidden sm:inline">
                List your property
              </NavLink>
              <NavLink href="/login">Login</NavLink>
              <NavLink href="/register" className="rounded-md bg-brand px-4 py-2 text-white! hover:text-white! hover:bg-brand-hover">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </HeaderFrame>
  );
}
