"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { api, FormError } from "@/components/forms";

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
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <FormError message={error} />
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">I want to</legend>
        {[
          { value: "CUSTOMER", label: "Book stays" },
          { value: "OWNER", label: "List my hotel" },
        ].map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-semibold ${
              role === o.value ? "border-brand bg-brand-50 text-brand" : "border-gray-300"
            }`}
          >
            <input type="radio" name="role" value={o.value} checked={role === o.value} onChange={() => setRole(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </fieldset>
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" required minLength={2} className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
      </div>
      <button className="btn w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
      <p className="text-center text-sm text-gray-600">
        Already registered? <Link href="/login" className="font-semibold text-brand">Sign in</Link>
      </p>
    </form>
  );
}
