import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoteForm, OrderActions } from "@/components/admin/OrderActions";
import { Badge, Card, dateTime, ORDER_TONE, PageHeader, Skeleton } from "@/components/admin/ui";
import { ProductImage } from "@/components/ProductImage";
import { can, requireStaff } from "@/lib/admin";
import { formatAddress, rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = { title: "Detail pesanan" };

export default function OrderAdminPage({ params }: PageProps<"/admin/pesanan/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <OrderAdmin params={params} />
    </Suspense>
  );
}

async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      user: { select: { id: true, name: true } },
    },
  });
  if (!order) notFound();
  const actorIds = [...new Set(order.history.map((h) => h.actorId).filter(Boolean))] as string[];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = (aid: string | null) => (aid ? (actors.find((a) => a.id === aid)?.name ?? "Staf") : "Sistem");
  const payment = order.payments[0];
  // Pesanan mode WhatsApp: tanpa batas bayar & ongkir belum ditentukan → admin mengonfirmasi manual.
  const manualPending = order.status === "PENDING_PAYMENT" && !order.paymentExpiresAt;

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        back={{ href: "/admin/pesanan", label: "Pesanan" }}
        description={<>Dibuat {dateTime.format(order.createdAt)} WIB</>}
        actions={
          <>
            <Badge tone={ORDER_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            <Link href={`/admin/pesanan/${order.id}/invoice`} className="btn-outline min-h-10 px-4">Invoice</Link>
            <Link href={`/admin/pesanan/${order.id}/label`} className="btn-outline min-h-10 px-4">Label kirim</Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title={`Barang (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-3 py-3 text-sm">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-blush">{it.imageUrl && <ProductImage src={it.imageUrl} alt="" fill sizes="56px" className="object-cover" />}</span>
                  <span className="flex-1">
                    <span className="block text-ink">{it.productName}</span>
                    <span className="text-muted">{it.colorName} · <span className="font-mono">{it.sku}</span></span>
                  </span>
                  <span className="text-right tabular-nums">{it.quantity} × {rupiah(it.unitPrice)}<span className="block font-medium">{rupiah(it.quantity * it.unitPrice)}</span></span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{rupiah(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt>Diskon {order.couponCode}</dt><dd className="tabular-nums">−{rupiah(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Ongkir ({order.totalWeightGram} g)</dt><dd className="tabular-nums">{manualPending ? <span className="text-muted">belum dikonfirmasi</span> : rupiah(order.shippingCost)}</dd></div>
              {order.shippingDiscount > 0 && <div className="flex justify-between"><dt>Potongan ongkir</dt><dd className="tabular-nums">−{rupiah(order.shippingDiscount)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{rupiah(order.total)}</dd></div>
            </dl>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Pembeli">
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink">{order.customerName}{order.user ? <Badge tone="plum">Member</Badge> : <Badge>Tamu</Badge>}</p>
              <p className="mt-1 text-sm text-muted">{order.email}</p>
              <a href={whatsappLink(`Halo ${order.customerName}, terkait pesanan ${order.orderNumber} di Zel Shop…`, order.phone.replace(/^0/, "62"))} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center text-sm text-plum underline">
                WhatsApp {order.phone}
              </a>
              {order.customerNote && <p className="mt-3 rounded-lg bg-cream p-3 text-sm">Catatan pembeli: {order.customerNote}</p>}
            </Card>
            <Card title="Pengiriman">
              <p className="text-sm text-ink">{order.recipientName} · {order.phone}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">{formatAddress(order)}</p>
              <p className="mt-3 text-sm">{COURIER_NAMES[order.courierCode] ?? order.courierCode} {order.courierService}{order.courierEtd && <span className="text-muted"> · {order.courierEtd}</span>}</p>
              {order.trackingNumber && <p className="mt-1 text-sm">Resi <span className="font-mono font-semibold">{order.trackingNumber}</span></p>}
            </Card>
          </div>
          <Card title="Pembayaran">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Metode dipilih</dt><dd>{PAYMENT_METHODS[order.paymentMethod ?? ""]?.label ?? order.paymentMethod ?? "-"}</dd></div>
              <div><dt className="text-muted">Status</dt><dd>{payment ? `${payment.status} · ${payment.provider}${payment.method ? ` (${payment.method})` : ""}` : "Belum ada transaksi"}</dd></div>
              <div><dt className="text-muted">Batas bayar</dt><dd>{order.paymentExpiresAt ? dateTime.format(order.paymentExpiresAt) : "-"}</dd></div>
              <div><dt className="text-muted">Dibayar</dt><dd>{order.paidAt ? dateTime.format(order.paidAt) : "-"}</dd></div>
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Tindakan">
            <OrderActions
              orderId={order.id}
              status={order.status}
              trackingNumber={order.trackingNumber}
              canCancel={can(user.role, "orders.cancel")}
              manual={manualPending ? { amountBeforeShipping: order.subtotal - order.discount, couriers: Object.entries(COURIER_NAMES).map(([value, label]) => ({ value, label })) } : null}
            />
          </Card>
          <Card title="Catatan internal">
            <NoteForm orderId={order.id} />
            {order.notes.length > 0 && (
              <ul className="mt-4 space-y-3 text-sm">
                {order.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-cream p-3">
                    <p className="whitespace-pre-line text-ink">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">{n.author.name} · {dateTime.format(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Riwayat status">
            <ol className="space-y-3 text-sm">
              {order.history.map((h) => (
                <li key={h.id}>
                  <Badge tone={ORDER_TONE[h.status]}>{STATUS_LABEL[h.status]}</Badge>
                  {h.note && <span className="ml-2 text-ink">{h.note}</span>}
                  <span className="block text-xs text-muted">{dateTime.format(h.createdAt)} · {actorName(h.actorId)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
