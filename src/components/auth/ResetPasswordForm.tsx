"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, FormError } from "./AuthCard";

export function ResetPasswordForm() {
  const sp = useSearchParams();
  const token = sp.get("token");
  const [error, setError] = useState<string | null>(sp.get("error") ? authErrorMessage({ code: "INVALID_TOKEN" }) : null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (done)
    return (
      <div className="space-y-4 text-center">
        <p role="status" className="text-ink">Kata sandi berhasil diubah.</p>
        <Link href="/masuk" className="btn-primary w-full">Masuk sekarang</Link>
      </div>
    );
  if (!token) return <FormError message={error ?? "Tautan tidak valid. Silakan minta tautan baru."} />;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const newPassword = String(fd.get("password"));
        if (newPassword !== String(fd.get("confirm"))) return setError("Konfirmasi kata sandi tidak cocok.");
        setLoading(true);
        const { error } = await authClient.resetPassword({ newPassword, token });
        setLoading(false);
        if (error) return setError(authErrorMessage(error));
        setDone(true);
      }}
    >
      <FormError message={error} />
      <div>
        <label htmlFor="password" className="label">Kata sandi baru</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Ulangi kata sandi baru</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary h-12 w-full">{loading ? "Menyimpan…" : "Simpan kata sandi"}</button>
    </form>
  );
}
