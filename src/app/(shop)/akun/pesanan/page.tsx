import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pesanan Saya", robots: { index: false } };
const df = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export default function OrdersPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <nav className="mb-4 text-sm text-muted"><Link href="/akun" className="hover:text-plum">Akun</Link> / <span className="text-ink">Pesanan</span></nav>
      <h1 className="mb-8 text-4xl">Pesanan Saya</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-blush" />}>
        <Orders />
      </Suspense>
    </div>
  );
}

async function Orders() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/akun/pesanan");
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, NOT: { orderNumber: { startsWith: "ZEL-SEED-" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { take: 3, select: { productName: true, quantity: true } }, _count: { select: { items: true } } },
  });
  if (!orders.length)
    return (
      <div className="rounded-[var(--radius-card)] bg-blush px-6 py-16 text-center">
        <h2 className="text-2xl">Belum ada pesanan</h2>
        <Link href="/produk" className="btn-primary mt-6">Mulai belanja</Link>
      </div>
    );
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pesanan/${o.orderNumber}`} className="block rounded-2xl border border-line bg-white p-5 hover:border-plum">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-semibold text-ink">{o.orderNumber}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${o.status === "CANCELLED" ? "bg-[#FBE9EC] text-danger" : "bg-plum-soft text-plum"}`}>{STATUS_LABEL[o.status]}</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {df.format(o.createdAt)} · {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
              {o._count.items > 3 && ` +${o._count.items - 3} lainnya`}
            </p>
            <p className="mt-2 font-semibold text-ink">{rupiah(o.total)}{o.trackingNumber && <span className="ml-3 text-sm font-normal text-muted">Resi: {o.trackingNumber}</span>}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
