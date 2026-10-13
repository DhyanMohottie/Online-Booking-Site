import { UserRound } from "lucide-react";
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/search">Hotels</NavLink>
          {user ? (
            <>
              {dash && <NavLink href={dash.href}>{dash.label}</NavLink>}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-sm border border-white/60 px-4 py-2 text-base font-semibold uppercase tracking-wider hover:border-brand md:text-lg hover:text-brand">
                  Sign out
                </button>
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
              <NavLink href="/register" className="rounded-sm bg-brand px-4 py-2 text-white! hover:text-white! hover:bg-brand-hover">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </HeaderFrame>
  );
}
