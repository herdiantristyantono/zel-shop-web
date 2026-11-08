import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { can, requireStaff, ROLE_LABEL, type Permission } from "@/lib/admin";

export const metadata: Metadata = { title: { template: "%s · Admin Zel Shop", default: "Admin Zel Shop" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/admin", label: "Ringkasan", perm: "dashboard" },
  { href: "/admin/pesanan", label: "Pesanan", perm: "orders" },
  { href: "/admin/produk", label: "Produk", perm: "products" },
  { href: "/admin/stok", label: "Stok", perm: "stock" },
  { href: "/admin/pelanggan", label: "Pelanggan", perm: "customers" },
  { href: "/admin/promo", label: "Promo", perm: "promo" },
  { href: "/admin/ulasan", label: "Ulasan", perm: "reviews" },
  { href: "/admin/laporan", label: "Laporan", perm: "reports" },
  { href: "/admin/pengaturan", label: "Pengaturan", perm: "settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[240px_1fr] print:block print:bg-white">
      <div className="print:hidden">
        <Suspense fallback={<div className="h-14 border-b border-line bg-white lg:h-dvh lg:border-r" />}>
          <Nav />
        </Suspense>
      </div>
      <main id="konten" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:p-0">{children}</main>
    </div>
  );
}

async function Nav() {
  const user = await requireStaff("dashboard");
  return <AdminNav items={NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }))} user={{ name: user.name, roleLabel: ROLE_LABEL[user.role] }} />;
}
