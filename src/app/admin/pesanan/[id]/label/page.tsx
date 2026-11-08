import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/admin/OrderActions";
import { Skeleton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { gramToKg } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";

export const metadata: Metadata = { title: "Label pengiriman" };

export default function LabelPage({ params }: PageProps<"/admin/pesanan/[id]/label">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Label params={params} />
    </Suspense>
  );
}

/** Label 10 × 15 cm (ukuran umum printer thermal). */
async function Label({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const { id } = await params;
  const [order, store] = await Promise.all([prisma.order.findUnique({ where: { id }, include: { items: true } }), getStoreSettings()]);
  if (!order) notFound();
  return (
    <>
      <style>{`@media print { @page { size: 100mm 150mm; margin: 0; } }`}</style>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Link href={`/admin/pesanan/${order.id}`} className="btn-ghost">← Kembali</Link>
        <PrintButton />
        <p className="w-full text-xs text-muted">Atur printer ke kertas 100 × 150 mm (label thermal) tanpa margin.</p>
      </div>
      <article className="flex h-[150mm] w-[100mm] flex-col border-2 border-ink bg-white text-[11px] leading-snug text-ink print:border-0">
        <header className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
          <span className="font-serif text-lg font-semibold tracking-[0.15em]">ZEL SHOP</span>
          <span className="text-right">
            <span className="block text-base font-bold">{COURIER_NAMES[order.courierCode] ?? order.courierCode.toUpperCase()}</span>
            <span className="font-semibold">{order.courierService}</span>
          </span>
        </header>
        <div className="border-b-2 border-ink px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-widest">No. resi</p>
          <p className="font-mono text-xl font-bold tracking-wider">{order.trackingNumber ?? "—"}</p>
          <p className="font-mono text-[10px]">{order.orderNumber}</p>
        </div>
        <section className="border-b border-ink px-3 py-2">
          <p className="text-[10px] font-bold uppercase">Penerima</p>
          <p className="text-sm font-bold">{order.recipientName}</p>
          <p className="font-semibold">{order.phone}</p>
          <p>{order.street}</p>
          <p>{order.district}, {order.city}</p>
          <p>{order.province} <strong>{order.postalCode}</strong></p>
        </section>
        <section className="border-b border-ink px-3 py-2">
          <p className="text-[10px] font-bold uppercase">Pengirim</p>
          <p className="font-semibold">{store.storeName} · {store.whatsappNumber}</p>
          <p>{store.address}</p>
        </section>
        <section className="flex-1 px-3 py-2">
          <p className="text-[10px] font-bold uppercase">Isi paket · {gramToKg(order.totalWeightGram)}</p>
          <ul>
            {order.items.map((i) => (
              <li key={i.id}>{i.quantity}× {i.productName} ({i.colorName})</li>
            ))}
          </ul>
          {order.customerNote && <p className="mt-1 italic">Catatan: {order.customerNote}</p>}
        </section>
        <footer className="border-t border-ink px-3 py-1 text-center text-[10px]">Barang mudah rusak — mohon tidak dibanting · Video unboxing untuk klaim</footer>
      </article>
    </>
  );
}
