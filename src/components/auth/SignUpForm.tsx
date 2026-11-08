"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { authErrorMessage, FormError, safeNext } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
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
          const password = String(fd.get("password"));
          if (password !== String(fd.get("confirm"))) return setError("Konfirmasi kata sandi tidak cocok.");
          setLoading(true);
          setError(null);
          const phone = String(fd.get("phone") || "").replace(/[^\d+]/g, "");
          const { error } = await signUp.email({
            name: String(fd.get("name")).trim(),
            email: String(fd.get("email")).trim(),
            password,
            phone: phone || undefined,
          });
          setLoading(false);
          if (error) return setError(authErrorMessage(error));
          router.replace(next);
          router.refresh();
        }}
      >
        <FormError message={error} />
        <div>
          <label htmlFor="name" className="label">Nama lengkap</label>
          <input id="name" name="name" autoComplete="name" required maxLength={80} className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">No. WhatsApp <span className="font-normal text-muted">(opsional)</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" pattern="[0-9+ -]{9,16}" className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Kata sandi</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" aria-describedby="pw-hint" />
          <p id="pw-hint" className="mt-1 text-xs text-muted">Minimal 8 karakter.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="label">Ulangi kata sandi</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Dengan mendaftar, Anda menyetujui <Link href="/info/syarat-ketentuan" className="text-plum underline">Syarat & Ketentuan</Link> dan{" "}
          <Link href="/info/kebijakan-privasi" className="text-plum underline">Kebijakan Privasi</Link> Zel Shop.
        </p>
        <button type="submit" disabled={loading} className="btn-primary h-12 w-full">{loading ? "Memproses…" : "Daftar"}</button>
      </form>
    </>
  );
}
