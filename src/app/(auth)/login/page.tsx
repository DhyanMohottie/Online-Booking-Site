import { Suspense } from "react";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in - StayFinder" };

const DEMO_ACCOUNTS = [
  { icon: UserRound, email: "customer1@demo.com", role: "Customer" },
  { icon: Building2, email: "owner1@demo.com", role: "Hotel owner" },
  { icon: ShieldCheck, email: "admin@demo.com", role: "Admin" },
];

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Enter your details to continue."
      sideTitle="Welcome back"
      sideText="Pick up where you left off: your bookings, your hotels and your next trip are one sign-in away."
    >
      <Suspense>
        <LoginForm />
      </Suspense>

      <div className="mt-8 rounded-xl bg-gray-50 p-4">
        <p className="text-sm font-semibold text-ink">
          Demo accounts <span className="font-normal text-gray-500">· password: password123</span>
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO_ACCOUNTS.map(({ icon: Icon, email, role }) => (
            <li key={email} className="flex items-center gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-black/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{email}</span>
                <span className="block text-xs text-gray-500 sm:hidden">{role}</span>
              </span>
              <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 sm:inline-block">{role}</span>
            </li>
          ))}
        </ul>
      </div>
    </AuthShell>
  );
}
