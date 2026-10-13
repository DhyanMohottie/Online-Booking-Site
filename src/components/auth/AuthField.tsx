"use client";

import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

type Props = {
  id: string;
  name: string;
  label: string;
  icon: LucideIcon;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
};

/** Labelled input with a leading icon; password fields get a show/hide toggle. */
export default function AuthField({ id, name, label, icon: Icon, type = "text", autoComplete, required = true, minLength, hint }: Props) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={isPassword && visible ? "text" : type}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className={`w-full rounded-md border border-transparent bg-gray-50 py-3 pl-11 text-base text-ink outline-none transition placeholder:text-gray-400 hover:bg-gray-100 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 ${isPassword ? "pr-12" : "pr-4"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
