import type { NextRequest } from "next/server";
import { verifySignature, type MidtransNotification } from "@/lib/midtrans";
import { applyMidtransStatus } from "@/lib/payments";

/**
 * Notifikasi pembayaran Midtrans.
 * Atur di dashboard Midtrans → Settings → Configuration → Payment Notification URL:
 *   https://domainanda.com/api/webhooks/midtrans
 * Keamanan: (1) verifikasi signature SHA512, (2) ambil ulang status dari API Midtrans,
 * (3) cocokkan nominal dengan total pesanan, (4) transisi status idempoten.
 */
export async function POST(req: NextRequest) {
  let body: MidtransNotification;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.order_id || !verifySignature(body)) return Response.json({ error: "invalid signature" }, { status: 403 });

  const result = await applyMidtransStatus(body.order_id, body);
  if (result === "AMOUNT_MISMATCH") return Response.json({ error: "amount mismatch" }, { status: 400 });
  return Response.json({ ok: true });
}
