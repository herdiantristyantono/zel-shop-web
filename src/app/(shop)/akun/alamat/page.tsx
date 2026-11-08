import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AddressBook } from "@/components/account/AddressBook";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Buku Alamat", robots: { index: false } };

export default function AddressPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <nav className="mb-4 text-sm text-muted"><Link href="/akun" className="hover:text-plum">Akun</Link> / <span className="text-ink">Buku Alamat</span></nav>
      <h1 className="mb-8 text-4xl">Buku Alamat</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-blush" />}>
        <Addresses />
      </Suspense>
    </div>
  );
}

async function Addresses() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/akun/alamat");
  const addresses = await prisma.address.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return <AddressBook addresses={addresses} />;
}
