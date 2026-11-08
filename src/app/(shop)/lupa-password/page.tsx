import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Lupa Kata Sandi", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Lupa Kata Sandi" subtitle="Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru." footer={<Link href="/masuk" className="font-medium text-plum underline">Kembali ke halaman masuk</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
