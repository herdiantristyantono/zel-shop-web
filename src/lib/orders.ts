import "server-only";
import type { OrderStatus } from "@/generated/prisma/client";
import { getSession } from "./auth";
import { prisma } from "./prisma";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** ZEL-20261108-7KQ2 (tanggal WIB) */
export function newOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `ZEL-${date}-${suffix}`;
}

/** Pesanan hanya bisa dilihat pemiliknya (login) atau pemegang token rahasia (checkout tamu). */
export async function getOrderForViewer(orderNumber: string, token?: string | null) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { include: { review: { select: { id: true, status: true } } } }, history: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return null;
  if (token && token.length >= 20 && token === order.accessToken) return order;
  const session = await getSession();
  if (session && order.userId === session.user.id) return order;
  return null;
}

/** true jika user yang login adalah pemilik pesanan (syarat menulis ulasan). */
export async function isOrderOwner(userId: string | null) {
  if (!userId) return false;
  const session = await getSession();
  return session?.user.id === userId;
}
