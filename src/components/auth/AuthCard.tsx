import Link from "next/link";
import { LogoMark } from "../Logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-10">
          <Link href="/" className="mx-auto mb-6 block w-fit" aria-label="Beranda">
            <LogoMark className="h-12 w-12" />
          </Link>
          <h1 className="text-center text-3xl sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-ink">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-[#FBE9EC] px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

/** Hanya izinkan redirect internal (cegah open-redirect). */
export function safeNext(next: string | null | undefined, fallback = "/akun") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Terjemahkan kode error Better Auth ke Bahasa Indonesia. */
export function authErrorMessage(err: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!err) return null;
  if (err.status === 429) return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  switch (err.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email atau kata sandi salah.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
    case "PASSWORD_TOO_SHORT":
      return "Kata sandi minimal 8 karakter.";
    case "INVALID_TOKEN":
      return "Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa.";
    case "INVALID_EMAIL":
      return "Format email tidak valid.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
}
