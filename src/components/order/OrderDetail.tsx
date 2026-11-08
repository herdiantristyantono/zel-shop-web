import Link from "next/link";
import type { getOrderForViewer } from "@/lib/orders";
import { STATUS_LABEL } from "@/lib/orders";
import { rupiah } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";
import { site, whatsappLink } from "@/lib/site";
import { Countdown } from "../Countdown";
import { ProductImage } from "../ProductImage";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForViewer>>>;

const FLOW = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;
const dt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function OrderDetail({ order, isNew }: { order: Order; isNew: boolean }) {
  const current = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const cancelled = order.status === "CANCELLED";
  return (
    <div className="space-y-8">
      {isNew && (
        <div className="rounded-2xl bg-plum p-6 text-white" role="status">
          <p className="font-serif text-3xl">Terima kasih, pesanan diterima!</p>
          <p className="mt-2 text-sm text-white/90">Detail pesanan juga kami kirim ke <strong>{order.email}</strong>. Simpan halaman ini untuk memantau status pesanan.</p>
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
          {/* Tahap 3: tombol Midtrans Snap / instruksi VA & QRIS dirender di sini */}
          <div id="payment-panel" className="mt-5 rounded-xl bg-blush p-4 text-sm text-ink">
            Halaman pembayaran online sedang disiapkan. Untuk sementara, hubungi admin kami untuk menyelesaikan pembayaran.
            <a href={whatsappLink(`Halo ${site.name}, saya mau bayar pesanan ${order.orderNumber}`)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full sm:w-auto">
              Hubungi via WhatsApp
            </a>
          </div>
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
                </span>
                <span className="font-medium">{rupiah(it.unitPrice * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-plum"><dt>Diskon {order.couponCode && `(${order.couponCode})`}</dt><dd>-{rupiah(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Ongkir</dt><dd>{rupiah(order.shippingCost)}</dd></div>
            {order.shippingDiscount > 0 && <div className="flex justify-between text-plum"><dt>Potongan ongkir</dt><dd>-{rupiah(order.shippingDiscount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{rupiah(order.total)}</dd></div>
          </dl>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 text-sm" aria-labelledby="kirim">
            <h2 id="kirim" className="text-xl">Pengiriman</h2>
            <p className="mt-3 font-medium text-ink">{order.recipientName} · {order.phone}</p>
            <p className="mt-1 text-muted">{order.street}, {order.district}, {order.city}, {order.province} {order.postalCode}</p>
            <p className="mt-3 text-ink">{COURIER_NAMES[order.courierCode] ?? order.courierCode} {order.courierService}{order.courierEtd && <span className="text-muted"> · estimasi {order.courierEtd}</span>}</p>
            {order.trackingNumber ? (
              <p className="mt-2">No. resi: <span className="font-mono font-semibold">{order.trackingNumber}</span></p>
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
