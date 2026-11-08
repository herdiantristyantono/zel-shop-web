import "server-only";
import { getTransactionStatus, outcomeOf, type MidtransNotification } from "./midtrans";
import { cancelPendingOrder, markOrderPaid } from "./order-service";
import { prisma } from "./prisma";

/**
 * Terapkan status transaksi Midtrans ke pesanan. Dipakai webhook & tombol "Cek status pembayaran".
 * `fallback` = isi webhook yang sudah lolos verifikasi signature (dipakai jika API status gagal).
 */
export async function applyMidtransStatus(orderNumber: string, fallback: MidtransNotification | null = null) {
  // Status dari API lebih dipercaya daripada isi webhook
  const status = (await getTransactionStatus(orderNumber).catch(() => null)) ?? fallback;
  if (!status) return "NO_TRANSACTION";
  const order = await prisma.order.findUnique({ where: { orderNumber: status.order_id }, select: { id: true } });
  if (!order) return "UNKNOWN_ORDER"; // mis. notifikasi uji dari dashboard

  const amount = Math.round(Number(status.gross_amount));
  const method = status.payment_type ?? null;
  const outcome = outcomeOf(status);

  if (outcome === "PAID") {
    const r = await markOrderPaid(status.order_id, { amount, method, transactionId: status.transaction_id, raw: status });
    return r;
  } else if (status.transaction_status === "expire") {
    await cancelPendingOrder(order.id, "Batas waktu pembayaran habis", { paymentStatus: "EXPIRED" });
  } else if (status.transaction_status === "cancel") {
    await cancelPendingOrder(order.id, "Pembayaran dibatalkan", { paymentStatus: "FAILED" });
  } else if (outcome === "REFUNDED") {
    await prisma.payment.updateMany({ where: { providerRef: status.order_id }, data: { status: "REFUNDED", raw: status as object } });
    const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } });
    await prisma.orderStatusHistory.create({ data: { orderId: order.id, status: current.status, note: "Dana dikembalikan (refund) via Midtrans" } });
  } else {
    // pending / deny / challenge: simpan info terakhir (mis. nomor VA). Pesanan tetap menunggu —
    // pembeli masih bisa mencoba metode lain sampai batas waktu.
    const va = status.va_numbers?.[0]?.va_number ?? status.permata_va_number ?? null;
    await prisma.payment.updateMany({ where: { providerRef: status.order_id }, data: { method, vaNumber: va, raw: status as object } });
  }
  return outcome;
}
