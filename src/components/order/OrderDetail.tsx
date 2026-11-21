import Link from "next/link";
import { Suspense } from "react";
import type { getOrderForViewer } from "@/lib/orders";
import { STATUS_LABEL } from "@/lib/orders";
import { formatAddress, rupiah } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";
import { site, whatsappLink } from "@/lib/site";
import { Countdown } from "../Countdown";
import { ProductImage } from "../ProductImage";
import { ConfirmReceivedButton, PaymentPanel } from "./PaymentPanel";
import { PurchaseTracker } from "./PurchaseTracker";
import { ReviewForm } from "./ReviewForm";
import { TrackingTimeline } from "./TrackingTimeline";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForViewer>>>;

const FLOW = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;
const dt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export type OrderViewer = { token: string | null; paymentMode: "midtrans" | "dev" | "manual"; canReview: boolean; waNumber: string };

/** Pesan WhatsApp berisi rincian pesanan untuk dikirim pembeli ke admin (mode checkout WhatsApp). */
function confirmationMessage(order: Order) {
  const items = order.items.map((i) => `• ${i.productName} (${i.colorName}) × ${i.quantity} = ${rupiah(i.unitPrice * i.quantity)}`).join("\n");
  return [
    `Halo ${site.name}, saya mau konfirmasi pesanan *${order.orderNumber}*`,
    "",
    items,
    order.discount > 0 ? `Diskon${order.couponCode ? ` (${order.couponCode})` : ""}: -${rupiah(order.discount)}` : null,
    `*Total: ${rupiah(order.total)}* (belum termasuk ongkir)`,
    "",
    `Kirim ke: ${order.recipientName} · ${order.phone}`,
    formatAddress(order),
    order.customerNote ? `Catatan: ${order.customerNote}` : null,
    "",
    "Mohon info ongkir & cara pembayarannya. Terima kasih 🙏",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function OrderDetail({ order, isNew, viewer }: { order: Order; isNew: boolean; viewer: OrderViewer }) {
  const current = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const cancelled = order.status === "CANCELLED";
  // Pesanan mode WhatsApp: belum ada batas bayar → menunggu konfirmasi admin
  const awaitingAdmin = order.status === "PENDING_PAYMENT" && !order.paymentExpiresAt;
  const confirmHref = whatsappLink(confirmationMessage(order), viewer.waNumber);
  return (
    <div className="space-y-8">
      {order.paidAt && order.status !== "CANCELLED" && (
        <PurchaseTracker orderNumber={order.orderNumber} total={order.total} items={order.items.map((i) => ({ id: i.sku, name: i.productName, price: i.unitPrice, quantity: i.quantity }))} />
      )}
      {isNew && (
        <div className="rounded-2xl bg-plum p-6 text-white" role="status">
          <p className="font-serif text-3xl">Terima kasih, pesanan diterima!</p>
          {awaitingAdmin ? (
            <>
              <p className="mt-2 text-sm text-white/90">
                <strong>Satu langkah lagi:</strong> kirim konfirmasi pesanan ke admin via WhatsApp. Admin akan menginformasikan ongkir dan cara pembayaran.
              </p>
              <a href={confirmHref} target="_blank" rel="noopener noreferrer" className="btn mt-4 w-full bg-white text-plum hover:bg-white/90 sm:w-auto">
                Konfirmasi via WhatsApp
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/90">Detail pesanan juga kami kirim ke <strong>{order.email}</strong> dan WhatsApp {order.phone}. Simpan halaman ini untuk memantau status pesanan.</p>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-label="Status pesanan">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">No. pesanan</p>
            <p className="font-mono text-lg font-semibold text-ink">{order.orderNumber}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${cancelled ? "bg-[#FBE9EC] text-danger" : "bg-plum-soft text-plum"}`}>{STATUS_LABEL[order.status]}</span>
        </div>
        {!cancelled && (
          <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-[11px] sm:text-xs">
            {FLOW.map((s, i) => (
              <li key={s} className="flex flex-col items-center gap-2">
                <span className={`h-1.5 w-full rounded-full ${i <= current ? "bg-plum" : "bg-line"}`} />
                <span className={i <= current ? "font-medium text-ink" : "text-muted"}>{STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
        {cancelled && order.cancelReason && <p className="mt-3 text-sm text-muted">Alasan: {order.cancelReason}</p>}
      </section>

      {order.status === "PENDING_PAYMENT" && order.paymentExpiresAt && (
        <section className="rounded-2xl border border-plum/40 bg-white p-5 sm:p-6" aria-labelledby="bayar">
          <h2 id="bayar" className="text-2xl">Selesaikan pembayaran</h2>
          <p className="mt-1 text-sm text-muted">
            Bayar <strong className="text-ink">{rupiah(order.total)}</strong> via {PAYMENT_METHODS[order.paymentMethod ?? ""]?.label ?? order.paymentMethod} sebelum{" "}
            <strong className="text-ink">{dt.format(order.paymentExpiresAt)} WIB</strong>. Pesanan dibatalkan otomatis setelah batas waktu.
          </p>
          <div className="mt-4"><Countdown endsAt={order.paymentExpiresAt.toISOString()} /></div>
          <Suspense>
            <PaymentPanel
              orderNumber={order.orderNumber}
              token={viewer.token}
              mode={viewer.paymentMode}
              whatsappHref={whatsappLink(`Halo ${site.name}, saya mau bayar pesanan ${order.orderNumber}`, viewer.waNumber)}
            />
          </Suspense>
        </section>
      )}

      {awaitingAdmin && (
        <section className="rounded-2xl border border-plum/40 bg-white p-5 sm:p-6" aria-labelledby="konfirmasi">
          <h2 id="konfirmasi" className="text-2xl">Menunggu konfirmasi admin</h2>
          <p className="mt-1 text-sm text-muted">
            Total <strong className="text-ink">{rupiah(order.total)}</strong> belum termasuk ongkir. Admin akan menghubungi Anda via WhatsApp untuk ongkir dan cara pembayaran.
            Belum dihubungi? Kirim konfirmasi lewat tombol di bawah.
          </p>
          <Suspense>
            <PaymentPanel orderNumber={order.orderNumber} token={viewer.token} mode="whatsapp" whatsappHref={confirmHref} />
          </Suspense>
        </section>
      )}

      {order.trackingNumber && (order.status === "SHIPPED" || order.status === "COMPLETED") && (
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="lacak">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="lacak" className="text-2xl">Lacak paket</h2>
              <p className="mt-1 text-sm text-muted">
                {COURIER_NAMES[order.courierCode] ?? order.courierCode} · resi <span className="font-mono font-semibold text-ink">{order.trackingNumber}</span>
              </p>
            </div>
            {order.status === "SHIPPED" && <ConfirmReceivedButton orderNumber={order.orderNumber} token={viewer.token} />}
          </div>
          <Suspense fallback={<div className="mt-4 h-24 animate-pulse rounded-xl bg-blush" />}>
            <TrackingTimeline waybill={order.trackingNumber} courierCode={order.courierCode} />
          </Suspense>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="item">
          <h2 id="item" className="text-2xl">Barang</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-3 py-3 text-sm">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-blush">
                  {it.imageUrl && <ProductImage src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                </span>
                <span className="flex-1">
                  <span className="block text-ink">{it.productName}</span>
                  <span className="text-muted">{it.colorName} · {it.quantity} × {rupiah(it.unitPrice)}</span>
                  {order.status === "COMPLETED" && viewer.canReview && it.productId && !it.review && <ReviewForm orderItemId={it.id} productName={it.productName} />}
                  {it.review && <span className="mt-1 block text-xs text-plum">Ulasan terkirim{it.review.status === "PENDING" ? " · menunggu moderasi" : ""}</span>}
                </span>
                <span className="font-medium">{rupiah(it.unitPrice * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-plum"><dt>Diskon {order.couponCode && `(${order.couponCode})`}</dt><dd>-{rupiah(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Ongkir</dt><dd>{awaitingAdmin ? <span className="text-muted">Dikonfirmasi admin</span> : rupiah(order.shippingCost)}</dd></div>
            {order.shippingDiscount > 0 && <div className="flex justify-between text-plum"><dt>Potongan ongkir</dt><dd>-{rupiah(order.shippingDiscount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{rupiah(order.total)}</dd></div>
          </dl>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 text-sm" aria-labelledby="kirim">
            <h2 id="kirim" className="text-xl">Pengiriman</h2>
            <p className="mt-3 font-medium text-ink">{order.recipientName} · {order.phone}</p>
            <p className="mt-1 whitespace-pre-line text-muted">{formatAddress(order)}</p>
            <p className="mt-3 text-ink">{COURIER_NAMES[order.courierCode] ?? order.courierCode} {order.courierService}{order.courierEtd && <span className="text-muted"> · estimasi {order.courierEtd}</span>}</p>
            {order.trackingNumber ? (
              <p className="mt-2">No. resi: <a href="#lacak" className="font-mono font-semibold underline">{order.trackingNumber}</a></p>
            ) : (
              <p className="mt-2 text-muted">No. resi tersedia setelah pesanan dikirim.</p>
            )}
            {order.customerNote && <p className="mt-3 rounded-lg bg-cream p-3 text-muted">Catatan: {order.customerNote}</p>}
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 text-sm" aria-labelledby="riwayat">
            <h2 id="riwayat" className="text-xl">Riwayat</h2>
            <ol className="mt-3 space-y-3">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-plum" />
                  <span>
                    <span className="block text-ink">{STATUS_LABEL[h.status]}{h.note && ` — ${h.note}`}</span>
                    <span className="text-muted">{dt.format(h.createdAt)} WIB</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <Link href="/produk" className="btn-outline w-full">Lanjut belanja</Link>
        </div>
      </div>
    </div>
  );
}
