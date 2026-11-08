import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

export default function SignInPage() {
  return (
    <AuthCard title="Selamat Datang" subtitle="Masuk untuk melihat pesanan, wishlist, dan alamat tersimpan." footer={<>Belum punya akun? <Link href="/daftar" className="font-medium text-plum underline">Daftar</Link></>}>
      <Suspense>
        <SignInForm googleEnabled={isGoogleEnabled} />
      </Suspense>
    </AuthCard>
  );
}
