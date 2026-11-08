"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSnapTransaction, expireTransaction, isMidtransEnabled } from "@/lib/midtrans";
import { orderLink } from "@/lib/notify";
import { cancelPendingOrder, completeOrder, markOrderPaid } from "@/lib/order-service";
import { getOrderForViewer } from "@/lib/orders";
import { applyMidtransStatus } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type Result = { ok: true; url?: string; message?: string } | { ok: false; error: string };
const ref = z.object({ orderNumber: z.string().min(5).max(30), token: z.string().max(80).nullable().optional() });

async function load(input: z.input<typeof ref>) {
  const p = ref.safeParse(input);
  if (!p.success) return null;
  return getOrderForViewer(p.data.orderNumber, p.data.token);
}

/** Buat (atau pakai ulang) halaman pembayaran Midtrans Snap. */
export async function startPayment(input: { orderNumber: string; token?: string | null }): Promise<Result> {
  const order = await load(input);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, error: "Pesanan ini tidak menunggu pembayaran." };
  if (order.paymentExpiresAt && order.paymentExpiresAt < new Date()) return { ok: false, error: "Batas waktu pembayaran sudah lewat." };
  if (!isMidtransEnabled()) return { ok: false, error: "Pembayaran online belum diaktifkan." };

  const existing = await prisma.payment.findUnique({ where: { providerRef: order.orderNumber } });
  if (existing?.status === "PENDING" && existing.redirectUrl) return { ok: true, url: existing.redirectUrl };

  try {
    const snap = await createSnapTransaction({
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingNet: order.shippingCost - order.shippingDiscount,
      paymentMethod: order.paymentMethod,
      expiresAt: order.paymentExpiresAt ?? new Date(Date.now() + 86_400_000),
      finishUrl: orderLink(order),
      customer: { name: order.customerName, email: order.email, phone: order.phone, address: order.street, city: order.city, postalCode: order.postalCode },
      items: order.items.map((i) => ({ sku: i.sku, name: `${i.productName} - ${i.colorName}`, price: i.unitPrice, quantity: i.quantity })),
    });
    await prisma.payment.upsert({
      where: { providerRef: order.orderNumber },
      update: { redirectUrl: snap.redirectUrl, status: "PENDING" },
      create: { orderId: order.id, provider: "midtrans", providerRef: order.orderNumber, amount: order.total, status: "PENDING", method: order.paymentMethod, redirectUrl: snap.redirectUrl, expiresAt: order.paymentExpiresAt },
    });
    return { ok: true, url: snap.redirectUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Cek status langsung ke Midtrans (jika webhook terlambat). */
export async function syncPayment(input: { orderNumber: string; token?: string | null }): Promise<Result> {
  const order = await load(input);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!isMidtransEnabled()) return { ok: false, error: "Pembayaran online belum diaktifkan." };
  const r = await applyMidtransStatus(order.orderNumber);
  refresh();
  if (r === "NO_TRANSACTION" || r === "PENDING") return { ok: true, message: "Pembayaran belum kami terima." };
  return { ok: true };
}

export async function cancelMyOrder(input: { orderNumber: string; token?: string | null }): Promise<Result> {
  const order = await load(input);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, error: "Pesanan yang sudah dibayar tidak bisa dibatalkan di sini. Hubungi kami via WhatsApp." };
  const session = await getSession();
  await expireTransaction(order.orderNumber);
  await cancelPendingOrder(order.id, "Dibatalkan oleh pembeli", { actorId: session?.user.id ?? null });
  refresh();
  return { ok: true };
}

export async function confirmReceived(input: { orderNumber: string; token?: string | null }): Promise<Result> {
  const order = await load(input);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  const session = await getSession();
  const ok = await completeOrder(order.id, session?.user.id ?? null);
  refresh();
  return ok ? { ok: true } : { ok: false, error: "Status pesanan sudah berubah." };
}

/** HANYA untuk pengembangan lokal tanpa kunci Midtrans. */
export async function simulatePayment(input: { orderNumber: string; token?: string | null }): Promise<Result> {
  if (isMidtransEnabled() || process.env.NODE_ENV === "production") return { ok: false, error: "Tidak tersedia." };
  const order = await load(input);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  await markOrderPaid(order.orderNumber, { amount: order.total, method: order.paymentMethod, note: "Pembayaran disimulasikan (mode pengembangan)" });
  refresh();
  return { ok: true };
}

const reviewSchema = z.object({
  orderItemId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).optional(),
});

/** Ulasan hanya dari pembeli terverifikasi (pesanan selesai, satu ulasan per item). Menunggu moderasi admin. */
export async function submitReview(input: z.input<typeof reviewSchema>): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Masuk untuk menulis ulasan." };
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Beri rating 1–5 bintang." };
  const item = await prisma.orderItem.findFirst({
    where: { id: p.data.orderItemId, order: { userId: session.user.id, status: "COMPLETED" } },
    include: { review: { select: { id: true } } },
  });
  if (!item || !item.productId) return { ok: false, error: "Ulasan hanya untuk pesanan Anda yang sudah selesai." };
  if (item.review) return { ok: false, error: "Anda sudah mengulas produk ini." };
  await prisma.review.create({ data: { productId: item.productId, userId: session.user.id, orderItemId: item.id, rating: p.data.rating, body: p.data.body || null } });
  refresh();
  return { ok: true, message: "Terima kasih! Ulasan akan tampil setelah ditinjau admin." };
}
