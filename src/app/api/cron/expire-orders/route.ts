import type { NextRequest } from "next/server";
import { expireOverdueOrders } from "@/lib/order-service";

/**
 * Batalkan pesanan yang melewati batas waktu bayar & kembalikan stok.
 * Vercel Cron (vercel.json) mengirim header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const cancelled = await expireOverdueOrders();
  return Response.json({ ok: true, cancelled });
}
