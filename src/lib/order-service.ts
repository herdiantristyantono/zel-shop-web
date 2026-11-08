import "server-only";
import { revalidateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { TAGS } from "./catalog";
import { loadForNotify, notifyLatePayment, notifyOrderCancelled, notifyOrderPaid, notifyOrderShipped } from "./notify";
import { activeFlashWhere } from "./pricing";
import { prisma } from "./prisma";

/**
 * Transisi status pesanan yang dipakai webhook, cron, aksi pelanggan, dan (nanti) dashboard admin.
 * Setiap transisi dijaga `updateMany where status = ...` agar idempoten & aman dari race condition.
 */

export type PaidInfo = { amount: number; method?: string | null; transactionId?: string | null; raw?: unknown; note?: string };

export async function markOrderPaid(orderNumber: string, info: PaidInfo): Promise<"PAID" | "ALREADY" | "LATE" | "AMOUNT_MISMATCH" | "NOT_FOUND"> {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) return "NOT_FOUND";
  if (info.amount !== order.total) {
    console.error(`[order] nominal tidak cocok ${orderNumber}: dibayar ${info.amount}, tagihan ${order.total}`);
    return "AMOUNT_MISMATCH";
  }

  const result = await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: order.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date() } });
    await upsertPayment(tx, order.id, orderNumber, order.total, "SUCCESS", info);
    if (moved.count !== 1) {
      if (order.status === "CANCELLED") {
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "CANCELLED", note: "Pembayaran diterima setelah pesanan dibatalkan — perlu tindak lanjut (proses ulang/refund)" } });
        return "LATE" as const;
      }
      return "ALREADY" as const;
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "PAID", note: info.note ?? `Pembayaran diterima${info.method ? ` (${info.method})` : ""}` } });
    for (const item of order.items) {
      if (!item.productId) continue;
      await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
      const flash = await tx.flashSaleItem.findFirst({ where: { productId: item.productId, salePrice: item.unitPrice, ...activeFlashWhere() } });
      if (flash) await tx.flashSaleItem.update({ where: { id: flash.id }, data: { soldCount: { increment: item.quantity } } });
    }
    return "PAID" as const;
  });

  if (result === "PAID") await notifyOrderPaid(order);
  if (result === "LATE") await notifyLatePayment(orderNumber);
  return result;
}

async function upsertPayment(tx: Prisma.TransactionClient, orderId: string, orderNumber: string, amount: number, status: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING", info?: Partial<PaidInfo>) {
  await tx.payment.upsert({
    where: { providerRef: orderNumber },
    update: { status, method: info?.method ?? undefined, raw: (info?.raw as Prisma.InputJsonValue) ?? undefined },
    create: { orderId, provider: process.env.MIDTRANS_SERVER_KEY ? "midtrans" : "manual", providerRef: orderNumber, amount, status, method: info?.method ?? null, raw: (info?.raw as Prisma.InputJsonValue) ?? undefined },
  });
}

/** Batalkan pesanan yang belum dibayar: kembalikan stok & kuota kupon. */
export async function cancelPendingOrder(
  orderId: string,
  reason: string,
  opts: { actorId?: string | null; paymentStatus?: "FAILED" | "EXPIRED"; revalidate?: boolean; notify?: boolean } = {},
) {
  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    if (moved.count !== 1) return false;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) {
      if (!item.variantId) continue;
      const v = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } }, select: { stock: true } }).catch(() => null);
      if (v) await tx.stockMovement.create({ data: { variantId: item.variantId, change: item.quantity, balance: v.stock, reason: "ORDER_CANCELLED", note: order.orderNumber, userId: opts.actorId ?? null } });
    }
    if (order.couponId) await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: opts.paymentStatus ?? "FAILED" } });
    await tx.orderStatusHistory.create({ data: { orderId, status: "CANCELLED", note: reason, actorId: opts.actorId ?? null } });
    return true;
  });
  if (done) {
    if (opts.revalidate !== false) revalidateTag(TAGS.products, "max");
    if (opts.notify !== false) await notifyOrderCancelled(await loadForNotify(orderId));
  }
  return done;
}

/** Dipanggil cron tiap 15 menit (dan secara malas saat halaman pesanan dibuka). */
export async function expireOverdueOrders(limit = 100) {
  const overdue = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", paymentExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: limit,
  });
  let count = 0;
  for (const o of overdue) {
    if (await cancelPendingOrder(o.id, "Batas waktu pembayaran habis", { paymentStatus: "EXPIRED", revalidate: false })) count++;
  }
  if (count) revalidateTag(TAGS.products, "max");
  return count;
}

/** Pelanggan menandai pesanan sudah diterima. */
export async function completeOrder(orderId: string, actorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderId, status: "SHIPPED" }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (moved.count !== 1) return false;
    await tx.orderStatusHistory.create({ data: { orderId, status: "COMPLETED", note: "Pesanan diterima pembeli", actorId: actorId ?? null } });
    return true;
  });
}

// ───────────── Transisi oleh admin ─────────────

/** PAID → PROCESSING (sedang dikemas) */
export async function startProcessing(orderId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderId, status: "PAID" }, data: { status: "PROCESSING" } });
    if (moved.count !== 1) return false;
    await tx.orderStatusHistory.create({ data: { orderId, status: "PROCESSING", note: "Pesanan sedang dikemas", actorId } });
    return true;
  });
}

/** PAID/PROCESSING → SHIPPED dengan nomor resi; atau perbarui resi saat sudah SHIPPED. Mengirim notifikasi ke pembeli. */
export async function shipOrder(orderId: string, trackingNumber: string, actorId: string) {
  const resi = trackingNumber.trim().toUpperCase();
  const r = await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderId, status: { in: ["PAID", "PROCESSING"] } }, data: { status: "SHIPPED", shippedAt: new Date(), trackingNumber: resi } });
    if (moved.count === 1) {
      await tx.orderStatusHistory.create({ data: { orderId, status: "SHIPPED", note: `Dikirim · resi ${resi}`, actorId } });
      return "SHIPPED" as const;
    }
    const fixed = await tx.order.updateMany({ where: { id: orderId, status: "SHIPPED" }, data: { trackingNumber: resi } });
    if (fixed.count === 1) {
      await tx.orderStatusHistory.create({ data: { orderId, status: "SHIPPED", note: `Resi diperbarui: ${resi}`, actorId } });
      return "UPDATED" as const;
    }
    return null;
  });
  if (r) await notifyOrderShipped(await loadForNotify(orderId));
  return r;
}

/** SHIPPED → COMPLETED oleh admin (mis. pembeli tidak menekan "diterima"). */
export async function adminCompleteOrder(orderId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderId, status: "SHIPPED" }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (moved.count !== 1) return false;
    await tx.orderStatusHistory.create({ data: { orderId, status: "COMPLETED", note: "Ditandai selesai oleh admin", actorId } });
    return true;
  });
}

/**
 * Batalkan pesanan yang SUDAH dibayar (PAID/PROCESSING): stok & kupon kembali, jumlah terjual dikurangi.
 * Pengembalian dana dilakukan manual (dashboard Midtrans / transfer) — dicatat di riwayat.
 */
export async function cancelPaidOrder(orderId: string, reason: string, actorId: string) {
  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PAID", "PROCESSING"] } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    if (moved.count !== 1) return false;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) {
      if (item.variantId) {
        const v = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } }, select: { stock: true } }).catch(() => null);
        if (v) await tx.stockMovement.create({ data: { variantId: item.variantId, change: item.quantity, balance: v.stock, reason: "ORDER_CANCELLED", note: order.orderNumber, userId: actorId } });
      }
      if (item.productId) await tx.product.updateMany({ where: { id: item.productId, soldCount: { gte: item.quantity } }, data: { soldCount: { decrement: item.quantity } } });
    }
    if (order.couponId) await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    await tx.orderStatusHistory.create({ data: { orderId, status: "CANCELLED", note: `${reason} — dana perlu dikembalikan ke pembeli`, actorId } });
    return true;
  });
  if (done) {
    revalidateTag(TAGS.products, "max");
    await notifyOrderCancelled(await loadForNotify(orderId));
  }
  return done;
}
