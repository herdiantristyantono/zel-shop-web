"use client";

import type { ReactNode } from "react";

export function Field({ label, htmlFor, error, hint, children, className = "" }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
      <input id={id} type="checkbox" className="h-5 w-5 accent-plum" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Notice({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${result.ok ? "bg-[#E6F2EA] text-[#245A3B]" : "bg-[#FBE9EC] text-danger"}`}>
      {result.text}
    </p>
  );
}
