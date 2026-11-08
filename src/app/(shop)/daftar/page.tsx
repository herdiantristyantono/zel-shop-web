import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Daftar", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthCard title="Buat Akun" subtitle="Simpan alamat, lacak pesanan, dan dapatkan info promo lebih dulu." footer={<>Sudah punya akun? <Link href="/masuk" className="font-medium text-plum underline">Masuk</Link></>}>
      <Suspense>
        <SignUpForm googleEnabled={isGoogleEnabled} />
      </Suspense>
    </AuthCard>
  );
}
