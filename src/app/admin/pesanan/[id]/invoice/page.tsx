import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "@/components/admin/OrderActions";
import { dateOnly, Skeleton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getStoreSettings, PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";

export const metadata: Metadata = { title: "Invoice" };

export default function InvoicePage({ params }: PageProps<"/admin/pesanan/[id]/invoice">) {
  return (
    <Suspense fallback={<Skeleton className="h-[800px]" />}>
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const { id } = await params;
  const [order, store] = await Promise.all([prisma.order.findUnique({ where: { id }, include: { items: true } }), getStoreSettings()]);
  if (!order) notFound();
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Link href={`/admin/pesanan/${order.id}`} className="btn-ghost">← Kembali</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 text-sm text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div>
              <p className="font-serif text-2xl tracking-[0.2em] text-plum">ZEL SHOP</p>
              <p className="text-xs text-muted">{store.address}</p>
              <p className="text-xs text-muted">{[store.email, store.whatsappNumber].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-serif text-3xl text-plum">INVOICE</p>
            <p className="font-mono">{order.orderNumber}</p>
            <p className="text-muted">Tanggal: {dateOnly.format(order.createdAt)}</p>
            <p className="text-muted">Status: {STATUS_LABEL[order.status]}{order.paidAt && ` (${dateOnly.format(order.paidAt)})`}</p>
          </div>
        </header>
        <section className="grid gap-6 py-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ditagihkan kepada</p>
            <p className="mt-1 font-medium">{order.customerName}</p>
            <p>{order.email}</p>
            <p>{order.phone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Dikirim ke</p>
            <p className="mt-1 font-medium">{order.recipientName}</p>
            <p>{order.street}, {order.district}, {order.city}, {order.province} {order.postalCode}</p>
            <p className="mt-1">{COURIER_NAMES[order.courierCode] ?? order.courierCode} {order.courierService}{order.trackingNumber && ` · Resi ${order.trackingNumber}`}</p>
          </div>
        </section>
        <table className="w-full text-left">
          <thead className="border-y border-line text-xs uppercase tracking-wider text-muted">
            <tr><th className="py-2">Produk</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Harga</th><th className="text-right">Jumlah</th></tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-line/60">
                <td className="py-2">{i.productName} — {i.colorName}</td>
                <td className="font-mono text-xs">{i.sku}</td>
                <td className="text-right">{i.quantity}</td>
                <td className="text-right tabular-nums">{rupiah(i.unitPrice)}</td>
                <td className="text-right tabular-nums">{rupiah(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{rupiah(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt>Diskon ({order.couponCode})</dt><dd className="tabular-nums">−{rupiah(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Ongkos kirim</dt><dd className="tabular-nums">{rupiah(order.shippingCost)}</dd></div>
          {order.shippingDiscount > 0 && <div className="flex justify-between"><dt>Potongan ongkir</dt><dd className="tabular-nums">−{rupiah(order.shippingDiscount)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{rupiah(order.total)}</dd></div>
          <div className="flex justify-between text-xs text-muted"><dt>Metode bayar</dt><dd>{PAYMENT_METHODS[order.paymentMethod ?? ""]?.label ?? "-"}</dd></div>
        </dl>
        <p className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">Terima kasih telah berbelanja di Zel Shop. Simpan invoice ini sebagai bukti pembelian.</p>
      </article>
    </>
  );
}
