import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Midtrans Snap (https://docs.midtrans.com/reference/snap-api).
 * Tanpa MIDTRANS_SERVER_KEY → mode pengembangan (pembayaran bisa disimulasikan di lokal).
 */
const serverKey = () => process.env.MIDTRANS_SERVER_KEY ?? "";
export const isMidtransEnabled = () => Boolean(serverKey());
const isProd = () => process.env.MIDTRANS_IS_PRODUCTION === "true";
const snapBase = () => (isProd() ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com");
const apiBase = () => (isProd() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com");
const authHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;

/** Metode di checkout → enabled_payments Snap */
export const SNAP_PAYMENTS: Record<string, string[]> = {
  qris: ["other_qris"],
  bank_transfer: ["bca_va", "bni_va", "bri_va", "echannel", "permata_va", "cimb_va", "other_va"],
  gopay: ["gopay"],
  shopeepay: ["shopeepay"],
  other_qris: ["other_qris"],
  credit_card: ["credit_card"],
};

export type SnapOrder = {
  orderNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingNet: number;
  paymentMethod: string | null;
  expiresAt: Date;
  finishUrl: string;
  customer: { name: string; email: string; phone: string; address: string; city: string; postalCode: string };
  items: { sku: string; name: string; price: number; quantity: number }[];
};

function jakartaTime(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")} +0700`;
}

export async function createSnapTransaction(o: SnapOrder): Promise<{ token: string; redirectUrl: string }> {
  const items = o.items.map((i) => ({ id: i.sku.slice(0, 50), name: i.name.slice(0, 50), price: i.price, quantity: i.quantity }));
  if (o.shippingNet > 0) items.push({ id: "ONGKIR", name: "Ongkos kirim", price: o.shippingNet, quantity: 1 });
  if (o.discount > 0) items.push({ id: "DISKON", name: "Diskon kupon", price: -o.discount, quantity: 1 });
  const sum = items.reduce((n, i) => n + i.price * i.quantity, 0);
  if (sum !== o.total) throw new Error(`Total item (${sum}) ≠ total pesanan (${o.total})`);

  const minutes = Math.max(1, Math.floor((o.expiresAt.getTime() - Date.now()) / 60_000));
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      transaction_details: { order_id: o.orderNumber, gross_amount: o.total },
      item_details: items,
      customer_details: {
        first_name: o.customer.name.slice(0, 50),
        email: o.customer.email,
        phone: o.customer.phone,
        shipping_address: { first_name: o.customer.name.slice(0, 50), phone: o.customer.phone, address: o.customer.address.slice(0, 200), city: o.customer.city, postal_code: o.customer.postalCode, country_code: "IDN" },
      },
      enabled_payments: o.paymentMethod ? SNAP_PAYMENTS[o.paymentMethod] : undefined,
      credit_card: { secure: true },
      expiry: { start_time: jakartaTime(new Date()), unit: "minute", duration: minutes },
      callbacks: { finish: o.finishUrl },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) {
    console.error("[midtrans] snap", res.status, body);
    throw new Error(body?.error_messages?.[0] ?? "Gagal membuat transaksi pembayaran");
  }
  return { token: body.token, redirectUrl: body.redirect_url };
}

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id?: string;
  fraud_status?: string;
  payment_type?: string;
  va_numbers?: { bank: string; va_number: string }[];
  permata_va_number?: string;
};

/** SHA512(order_id + status_code + gross_amount + ServerKey) — dibandingkan constant-time. */
export function verifySignature(n: Pick<MidtransNotification, "order_id" | "status_code" | "gross_amount" | "signature_key">) {
  if (!serverKey() || !n.signature_key) return false;
  const expected = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey()}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(n.signature_key));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Ambil status langsung dari Midtrans (sumber kebenaran, tidak mengandalkan isi webhook). */
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification | null> {
  const res = await fetch(`${apiBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => null);
  // Hanya terima respons transaksi yang sah (bukan 401/404/5xx)
  if (!res.ok || !body?.order_id || !body?.transaction_status || !["200", "201", "202", "407"].includes(String(body.status_code))) return null;
  return body as MidtransNotification;
}

export type PaymentOutcome = "PAID" | "PENDING" | "FAILED" | "EXPIRED" | "REFUNDED" | "CHALLENGE";

export function outcomeOf(n: Pick<MidtransNotification, "transaction_status" | "fraud_status">): PaymentOutcome {
  switch (n.transaction_status) {
    case "capture":
      return n.fraud_status === "challenge" ? "CHALLENGE" : n.fraud_status === "deny" ? "FAILED" : "PAID";
    case "settlement":
      return "PAID";
    case "pending":
      return "PENDING";
    case "expire":
      return "EXPIRED";
    case "refund":
    case "partial_refund":
      return "REFUNDED";
    default: // deny, cancel, failure
      return "FAILED";
  }
}

/** Hentikan transaksi pending (mis. VA) agar tidak bisa dibayar setelah pesanan dibatalkan. */
export async function expireTransaction(orderId: string) {
  if (!isMidtransEnabled()) return;
  await fetch(`${apiBase()}/v2/${encodeURIComponent(orderId)}/expire`, {
    method: "POST",
    headers: { Authorization: authHeader(), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch((e) => console.error("[midtrans] expire", e));
}
