"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { FormError } from "@/components/forms";

export default function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
      setBusy(false);
      return;
    }
    // Hard navigation so the server components pick up the new session.
    const callback = params.get("callbackUrl");
    window.location.href = callback && callback.startsWith("/") ? callback : "/dashboard";
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      <button className="btn w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      <p className="text-center text-sm text-gray-600">
        New here? <Link href="/register" className="font-semibold text-brand">Create an account</Link>
      </p>
    </form>
  );
}
