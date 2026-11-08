"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { authErrorMessage, FormError, safeNext } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      {googleEnabled && <GoogleButton next={next} />}
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setLoading(true);
          setError(null);
          const { error } = await signIn.email({ email: String(fd.get("email")), password: String(fd.get("password")), rememberMe: fd.get("remember") === "on" });
          setLoading(false);
          if (error) return setError(authErrorMessage(error));
          router.replace(next);
          router.refresh();
        }}
      >
        <FormError message={error} />
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Kata sandi</label>
            <Link href="/lupa-password" className="mb-1.5 text-sm text-plum hover:underline">Lupa kata sandi?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="remember" defaultChecked className="h-5 w-5 accent-plum" /> Ingat saya
        </label>
        <button type="submit" disabled={loading} className="btn-primary h-12 w-full">{loading ? "Memproses…" : "Masuk"}</button>
      </form>
    </>
  );
}
