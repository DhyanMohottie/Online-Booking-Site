"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Building2, Lock, Luggage, Mail, UserRound } from "lucide-react";
import { api, FormError } from "@/components/forms";
import AuthField from "@/components/auth/AuthField";

const ROLES = [
  { value: "CUSTOMER", label: "Book stays", hint: "Find and reserve hotels", icon: Luggage },
  { value: "OWNER", label: "List my hotel", hint: "Manage rooms and bookings", icon: Building2 },
];

export default function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "OWNER" ? "OWNER" : "CUSTOMER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    try {
      await api("/api/register", "POST", { name: fd.get("name"), email, password, role });
      await signIn("credentials", { email, password, redirect: false });
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormError message={error} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">I want to</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ value, label, hint, icon: Icon }) => {
            const selected = role === value;
            return (
              <label key={value} className="relative cursor-pointer">
                <input type="radio" name="role" value={value} checked={selected} onChange={() => setRole(value)} className="peer sr-only" />
                <span
                  className={`flex h-full flex-col gap-1 rounded-xl border p-3.5 transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 ${
                    selected ? "border-brand bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className={`font-semibold ${selected ? "text-brand" : "text-ink"}`}>{label}</span>
                  <span className="text-sm text-gray-500">{hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <AuthField id="name" name="name" label="Full name" icon={UserRound} autoComplete="name" minLength={2} />
      <AuthField id="email" name="email" type="email" label="Email" icon={Mail} autoComplete="email" />
      <AuthField
        id="password"
        name="password"
        type="password"
        label="Password"
        icon={Lock}
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters."
      />
      <button type="submit" className="btn w-full py-3.5 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg" disabled={busy}>
        {busy ? "Creating account..." : "Create account"}
        {!busy && <ArrowRight size={16} aria-hidden="true" />}
      </button>
      <p className="text-center text-base text-gray-600">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
