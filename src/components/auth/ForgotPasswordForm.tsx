"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, FormError } from "./AuthCard";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (sent)
    return (
      <p role="status" className="rounded-xl bg-blush p-4 text-sm leading-relaxed text-ink">
        Jika email tersebut terdaftar, kami telah mengirim tautan untuk mengatur ulang kata sandi. Periksa kotak masuk atau folder spam Anda.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const email = String(new FormData(e.currentTarget).get("email"));
        const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setLoading(false);
        // Selalu tampilkan pesan yang sama agar tidak membocorkan email terdaftar, kecuali rate-limit.
        if (error?.status === 429) return setError(authErrorMessage(error));
        setSent(true);
      }}
    >
      <FormError message={error} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary h-12 w-full">{loading ? "Mengirim…" : "Kirim tautan"}</button>
    </form>
  );
}
