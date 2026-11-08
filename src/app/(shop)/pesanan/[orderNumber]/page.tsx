import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderDetail } from "@/components/order/OrderDetail";
import { isMidtransEnabled } from "@/lib/midtrans";
import { cancelPendingOrder } from "@/lib/order-service";
import { getOrderForViewer, isOrderOwner } from "@/lib/orders";
import { getStorefront } from "@/lib/settings";

export const metadata: Metadata = { title: "Status Pesanan", robots: { index: false, follow: false } };

export default function OrderPage(props: PageProps<"/pesanan/[orderNumber]">) {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="mb-8 text-4xl">Status Pesanan</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-blush" />}>
        <OrderLoader {...props} />
      </Suspense>
    </div>
  );
}

async function OrderLoader({ params, searchParams }: PageProps<"/pesanan/[orderNumber]">) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.token === "string" ? sp.token : null;
  let order = await getOrderForViewer(orderNumber.slice(0, 30), token);
  if (!order) notFound();
  // Pembatalan "malas": jika cron belum jalan tapi batas bayar sudah lewat
  if (order.status === "PENDING_PAYMENT" && order.paymentExpiresAt && order.paymentExpiresAt < new Date()) {
    await cancelPendingOrder(order.id, "Batas waktu pembayaran habis", { paymentStatus: "EXPIRED", revalidate: false });
    order = (await getOrderForViewer(order.orderNumber, token))!;
  }
  const paymentMode = isMidtransEnabled() ? "midtrans" : process.env.NODE_ENV !== "production" ? "dev" : "manual";
  return <OrderDetail order={order} isNew={sp.baru === "1"} viewer={{ token, paymentMode, canReview: await isOrderOwner(order.userId), waNumber: (await getStorefront()).whatsapp }} />;
}
