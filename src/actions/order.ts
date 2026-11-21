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
import { findReviewableItem, MAX_REVIEW_PHOTOS } from "@/lib/reviews";
import { cloudinaryDeliveryUrl, cloudinarySignature, isCloudinaryEnabled, isOwnUploadUrl } from "@/lib/upload";
import type { UploadTarget } from "@/components/upload-client";

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
  // Pesanan mode WhatsApp (tanpa batas bayar): ongkir belum final, pembayaran lewat admin
  if (!order.paymentExpiresAt) return { ok: false, error: "Pembayaran pesanan ini dikonfirmasi oleh admin via WhatsApp." };
  if (order.paymentExpiresAt < new Date()) return { ok: false, error: "Batas waktu pembayaran sudah lewat." };
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
  if (!order.paymentExpiresAt) return { ok: false, error: "Pembayaran pesanan ini dikonfirmasi oleh admin." };
  await markOrderPaid(order.orderNumber, { amount: order.total, method: order.paymentMethod, note: "Pembayaran disimulasikan (mode pengembangan)" });
  refresh();
  return { ok: true };
}

const reviewSchema = z.object({
  orderItemId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).optional(),
  images: z.array(z.string().max(500)).max(MAX_REVIEW_PHOTOS).optional(),
});

/** Izin unggah foto ulasan — hanya untuk pembeli dengan item yang bisa diulas. */
export async function getReviewUploadTarget(orderItemId: string): Promise<{ ok: true; data: UploadTarget } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Masuk untuk mengunggah foto." };
  if (typeof orderItemId !== "string" || !(await findReviewableItem(session.user.id, orderItemId))) return { ok: false, error: "Ulasan hanya untuk pesanan Anda yang sudah selesai." };
  if (isCloudinaryEnabled()) return { ok: true, data: { mode: "cloudinary", ...cloudinarySignature("reviews") } };
  if (process.env.NODE_ENV !== "production") return { ok: true, data: { mode: "local" } };
  return { ok: true, data: { mode: "disabled" } };
}

export async function toReviewDeliveryUrl(secureUrl: string) {
  if (typeof secureUrl !== "string" || !/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/(v\d+\/)?zelshop\/reviews\//.test(secureUrl)) return "";
  return cloudinaryDeliveryUrl(secureUrl);
}

/** Ulasan hanya untuk pembeli terverifikasi: item milik user, pesanan COMPLETED, satu ulasan per item. */
export async function submitReview(input: z.input<typeof reviewSchema>): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Masuk untuk menulis ulasan." };
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Beri rating 1–5 bintang (maks. 3 foto)." };
  const images = [...new Set(p.data.images ?? [])];
  if (images.some((u) => !isOwnUploadUrl(u, "reviews"))) return { ok: false, error: "Foto tidak valid. Unggah ulang fotonya." };
  const item = await findReviewableItem(session.user.id, p.data.orderItemId);
  if (!item) return { ok: false, error: "Ulasan hanya untuk pesanan Anda yang sudah selesai dan belum diulas." };
  try {
    await prisma.review.create({
      data: {
        productId: item.productId,
        userId: session.user.id,
        orderItemId: item.id,
        rating: p.data.rating,
        body: p.data.body || null,
        images: { create: images.map((url) => ({ url })) },
      },
    });
  } catch {
    return { ok: false, error: "Anda sudah mengulas produk ini." }; // orderItemId unik (kirim ganda)
  }
  refresh();
  return { ok: true, message: "Terima kasih! Ulasan akan tampil setelah ditinjau admin." };
}
