"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin";
import { expireTransaction } from "@/lib/midtrans";
import { adminCompleteOrder, cancelPaidOrder, cancelPendingOrder, shipOrder, startProcessing } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";

const id = z.string().min(1).max(40);

export async function processOrder(orderId: string) {
  return adminAction("orders", async (user) => {
    if (!id.safeParse(orderId).success) return { ok: false, error: "Data tidak valid." };
    const ok = await startProcessing(orderId, user.id);
    refresh();
    return ok ? { ok: true, message: "Pesanan ditandai sedang dikemas." } : { ok: false, error: "Status pesanan sudah berubah." };
  });
}

export async function markShipped(orderId: string, trackingNumber: string) {
  return adminAction("orders", async (user) => {
    const resi = z.string().trim().regex(/^[A-Za-z0-9-]{6,40}$/, "Nomor resi 6–40 huruf/angka").safeParse(trackingNumber);
    if (!id.safeParse(orderId).success || !resi.success) return { ok: false, error: resi.success ? "Data tidak valid." : resi.error.issues[0].message };
    const r = await shipOrder(orderId, resi.data, user.id);
    refresh();
    if (!r) return { ok: false, error: "Pesanan belum dibayar atau sudah selesai/dibatalkan." };
    return { ok: true, message: r === "SHIPPED" ? "Pesanan ditandai dikirim. Pembeli sudah diberi tahu." : "Nomor resi diperbarui & pembeli diberi tahu." };
  });
}

export async function markCompleted(orderId: string) {
  return adminAction("orders", async (user) => {
    const ok = await adminCompleteOrder(orderId, user.id);
    refresh();
    return ok ? { ok: true, message: "Pesanan selesai." } : { ok: false, error: "Hanya pesanan berstatus Dikirim yang bisa diselesaikan." };
  });
}

export async function adminCancelOrder(orderId: string, reason: string) {
  return adminAction("orders.cancel", async (user) => {
    const why = z.string().trim().min(3, "Isi alasan pembatalan").max(200).safeParse(reason);
    if (!why.success) return { ok: false, error: why.error.issues[0].message };
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, orderNumber: true } });
    if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
    let ok = false;
    if (order.status === "PENDING_PAYMENT") {
      await expireTransaction(order.orderNumber);
      ok = await cancelPendingOrder(orderId, why.data, { actorId: user.id });
    } else if (order.status === "PAID" || order.status === "PROCESSING") {
      ok = await cancelPaidOrder(orderId, why.data, user.id);
    }
    refresh();
    return ok
      ? { ok: true, message: order.status === "PENDING_PAYMENT" ? "Pesanan dibatalkan." : "Pesanan dibatalkan. Jangan lupa kembalikan dana pembeli." }
      : { ok: false, error: "Pesanan yang sudah dikirim/selesai tidak bisa dibatalkan." };
  });
}

export async function addOrderNote(orderId: string, body: string) {
  return adminAction("orders", async (user) => {
    const text = z.string().trim().min(1, "Catatan kosong").max(1000).safeParse(body);
    if (!text.success || !id.safeParse(orderId).success) return { ok: false, error: "Catatan tidak valid." };
    await prisma.orderNote.create({ data: { orderId, authorId: user.id, body: text.data } });
    refresh();
    return { ok: true };
  });
}
