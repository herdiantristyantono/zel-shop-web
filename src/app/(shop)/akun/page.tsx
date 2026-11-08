import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun Saya", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl">Akun Saya</h1>
      <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-2xl bg-blush" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}

async function AccountContent() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/akun");
  const { user } = session;
  const isStaff = user.role && user.role !== "CUSTOMER";
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[1fr_2fr]">
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-2xl">Profil</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div><dt className="text-muted">Nama</dt><dd className="text-ink">{user.name}</dd></div>
          <div><dt className="text-muted">Email</dt><dd className="text-ink">{user.email}</dd></div>
          {user.phone && <div><dt className="text-muted">WhatsApp</dt><dd className="text-ink">{user.phone}</dd></div>}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <SignOutButton />
          {isStaff && <Link href="/admin" className="btn-primary">Dashboard Admin</Link>}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          ["Pesanan Saya", "Riwayat, status, dan lacak resi", "/akun/pesanan"],
          ["Buku Alamat", "Kelola alamat pengiriman", "/akun/alamat"],
          ["Wishlist", "Produk favorit Anda", "/wishlist"],
          ["Keranjang", "Lanjutkan belanja", "/keranjang"],
        ].map(([title, sub, href]) => (
          <Link key={href} href={href} className="rounded-2xl border border-line bg-white p-6 hover:border-plum">
            <h3 className="text-xl">{title}</h3>
            <p className="mt-1 text-sm text-muted">{sub}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
