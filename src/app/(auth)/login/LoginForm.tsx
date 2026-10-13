"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { FormError } from "@/components/forms";
import AuthField from "@/components/auth/AuthField";

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
    <form onSubmit={onSubmit} className="space-y-5">
      <FormError message={error} />
      <AuthField id="email" name="email" type="email" label="Email" icon={Mail} autoComplete="email" />
      <AuthField id="password" name="password" type="password" label="Password" icon={Lock} autoComplete="current-password" />
      <button type="submit" className="btn w-full py-3.5 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg" disabled={busy}>
        {busy ? "Signing in..." : "Sign in"}
        {!busy && <ArrowRight size={16} aria-hidden="true" />}
      </button>
      <p className="text-center text-base text-gray-600">
        New here?{" "}
        <Link href="/register" className="font-semibold text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
