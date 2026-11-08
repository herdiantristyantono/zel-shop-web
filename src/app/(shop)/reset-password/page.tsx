import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Atur Ulang Kata Sandi", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Kata Sandi Baru">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
