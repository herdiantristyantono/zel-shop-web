import "server-only";
import { COURIER_NAMES } from "./shipping";
import { emailLayout, sendEmail } from "./email";
import { rupiah } from "./format";
import { prisma } from "./prisma";
import { getStoreSettings } from "./settings";
import { site } from "./site";
import { sendWhatsApp } from "./whatsapp";

type OrderLike = {
  orderNumber: string;
  accessToken: string;
  email: string;
  customerName: string;
  phone: string;
  total: number;
  paymentExpiresAt?: Date | null;
  courierCode?: string;
  courierService?: string;
  trackingNumber?: string | null;
  cancelReason?: string | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const orderLink = (o: Pick<OrderLike, "orderNumber" | "accessToken">) => `${site.url}/pesanan/${o.orderNumber}?token=${o.accessToken}`;
const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;margin-top:12px;background:#5B2A45;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${label}</a></p>`;
const deadline = (d?: Date | null) =>
  d ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(d) + " WIB" : "";

async function both(o: OrderLike, subject: string, htmlBody: string, wa: string) {
  await Promise.allSettled([
    sendEmail({ to: o.email, subject, html: emailLayout(subject, htmlBody), text: wa }),
    sendWhatsApp(o.phone, wa),
  ]);
}

async function notifyAdmin(message: string) {
  const s = await getStoreSettings();
  const number = s.whatsappNumber ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (number) await sendWhatsApp(number, message);
}

export async function notifyOrderCreated(o: OrderLike) {
  const link = orderLink(o);
  await sendWhatsApp(
    o.phone,
    `Halo ${o.customerName}, terima kasih telah berbelanja di Zel Shop 💜\n\nPesanan *${o.orderNumber}* sebesar *${rupiah(o.total)}* menunggu pembayaran${o.paymentExpiresAt ? ` sebelum ${deadline(o.paymentExpiresAt)}` : ""}.\n\nBayar & cek status: ${link}`,
  );
  // Email rincian dikirim dari placeOrder (berisi daftar barang).
}

export async function notifyOrderPaid(o: OrderLike) {
  const link = orderLink(o);
  await both(
    o,
    `Pembayaran pesanan ${o.orderNumber} berhasil`,
    `<p>Halo ${esc(o.customerName)},</p><p>Pembayaran <strong>${rupiah(o.total)}</strong> untuk pesanan <strong>${o.orderNumber}</strong> sudah kami terima. Pesanan Anda segera kami kemas dan kirim.</p>${button(link, "Lihat pesanan")}`,
    `Halo ${o.customerName}, pembayaran pesanan *${o.orderNumber}* (${rupiah(o.total)}) sudah kami terima ✅\nPesanan segera kami kemas & kirim.\n\nStatus: ${link}`,
  );
  await notifyAdmin(`🛍️ Pesanan baru DIBAYAR: ${o.orderNumber}\n${o.customerName} · ${rupiah(o.total)}\nSegera proses di dashboard.`);
}

export async function notifyOrderCancelled(o: OrderLike) {
  const link = orderLink(o);
  await both(
    o,
    `Pesanan ${o.orderNumber} dibatalkan`,
    `<p>Halo ${esc(o.customerName)},</p><p>Pesanan <strong>${o.orderNumber}</strong> dibatalkan${o.cancelReason ? `: ${esc(o.cancelReason)}` : ""}.</p><p>Jika ini keliru atau Anda sudah membayar, balas email ini atau hubungi kami via WhatsApp.</p>${button(`${site.url}/produk`, "Belanja lagi")}`,
    `Halo ${o.customerName}, pesanan *${o.orderNumber}* dibatalkan${o.cancelReason ? ` (${o.cancelReason})` : ""}.\nJika Anda sudah membayar, hubungi kami ya.\n\nDetail: ${link}`,
  );
}

/** Dipanggil dashboard admin (Tahap 4) saat resi diinput. */
export async function notifyOrderShipped(o: OrderLike) {
  const link = orderLink(o);
  const courier = `${COURIER_NAMES[o.courierCode ?? ""] ?? o.courierCode ?? ""} ${o.courierService ?? ""}`.trim();
  await both(
    o,
    `Pesanan ${o.orderNumber} sudah dikirim`,
    `<p>Halo ${esc(o.customerName)},</p><p>Pesanan <strong>${o.orderNumber}</strong> sudah dikirim dengan ${esc(courier)}.</p><p>No. resi: <strong style="font-family:monospace">${esc(o.trackingNumber ?? "-")}</strong></p>${button(link, "Lacak pesanan")}`,
    `Halo ${o.customerName}, pesanan *${o.orderNumber}* sudah dikirim 🚚\nKurir: ${courier}\nNo. resi: *${o.trackingNumber ?? "-"}*\n\nLacak: ${link}`,
  );
}

export async function notifyLatePayment(orderNumber: string) {
  await notifyAdmin(`⚠️ Pembayaran masuk untuk pesanan ${orderNumber} yang SUDAH DIBATALKAN. Cek stok lalu proses ulang atau refund.`);
}

export async function loadForNotify(orderId: string) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}
