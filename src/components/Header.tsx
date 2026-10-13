import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

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
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Stay<span className="text-accent">Finder</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {dash && (
                <Link href={dash.href} className="rounded-md px-3 py-1.5 font-medium hover:bg-white/10">
                  {dash.label}
                </Link>
              )}
              <span className="hidden text-white/80 sm:inline">{user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-md border border-white/60 px-3 py-1.5 font-medium hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/register?role=OWNER" className="hidden rounded-md px-3 py-1.5 hover:bg-white/10 sm:inline">
                List your property
              </Link>
              <Link href="/register" className="rounded-md bg-white px-3 py-1.5 font-semibold text-brand hover:bg-gray-100">
                Register
              </Link>
              <Link href="/login" className="rounded-md border border-white/60 px-3 py-1.5 font-semibold hover:bg-white/10">
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
