"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { findCart, getCartLines, getCartOwner, summarize, type CartLine } from "@/lib/cart";
import { TAGS } from "@/lib/catalog";
import { computeTotals, type Totals } from "@/lib/coupon";
import { emailLayout, sendEmail } from "@/lib/email";
import { rupiah } from "@/lib/format";
import { isWhatsAppCheckout } from "@/lib/checkout-mode";
import { notifyOrderCreated, notifyOrderCreatedManual } from "@/lib/notify";
import { newOrderNumber } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, getStoreSettings } from "@/lib/settings";
import { getRates, searchAreas, type Area, type Rate } from "@/lib/shipping";
import { addressSchema, contactSchema, manualAddressSchema } from "@/lib/validation";

type Destination = { recipientName: string; phone: string; street: string; province: string; city: string; district: string; postalCode: string; areaId: string | null };
import { site } from "@/lib/site";

async function loadCart() {
  const cart = await findCart(false);
  if (!cart) return { lines: [] as CartLine[], cartId: null };
  return { lines: await getCartLines(cart.id), cartId: cart.id };
}

const rateItems = (lines: CartLine[]) =>
  lines.map((l) => ({ name: `${l.productName} - ${l.colorName}`, value: l.unitPrice, weightGram: l.weightGram, quantity: l.quantity }));

export async function findAreas(q: string): Promise<Area[]> {
  if (typeof q !== "string") return [];
  try {
    return await searchAreas(q.slice(0, 60));
  } catch {
    return [];
  }
}

export async function getShippingOptions(areaId: string): Promise<{ ok: true; rates: Rate[] } | { ok: false; error: string }> {
  if (typeof areaId !== "string" || !areaId) return { ok: false, error: "Pilih alamat tujuan." };
  const { lines } = await loadCart();
  if (!lines.length) return { ok: false, error: "Keranjang kosong." };
  try {
    const rates = await getRates(areaId, rateItems(lines.filter((l) => !l.issue)));
    if (!rates.length) return { ok: false, error: "Belum ada kurir yang melayani alamat ini." };
    return { ok: true, rates };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Pratinjau total (ongkir dari pilihan klien hanya untuk tampilan; placeOrder menghitung ulang). */
export async function previewTotals(input: { shippingCost: number; couponCode?: string; email?: string }): Promise<Totals> {
  const { lines } = await loadCart();
  const { userId } = await getCartOwner();
  const subtotal = summarize(lines).subtotal;
  return computeTotals({
    subtotal,
    shippingCost: Math.max(0, Math.floor(Number(input.shippingCost) || 0)),
    couponCode: typeof input.couponCode === "string" ? input.couponCode.slice(0, 30) : null,
    userId,
    email: typeof input.email === "string" ? input.email.slice(0, 120) : null,
  });
}

const orderSchema = z.object({
  contact: contactSchema.optional(), // wajib untuk tamu
  addressId: z.string().max(40).optional(),
  // Divalidasi di placeOrder sesuai mode: addressSchema (normal) atau manualAddressSchema (WhatsApp)
  address: z.unknown().optional(),
  saveAddress: z.boolean().optional(),
  // Kosong pada mode WhatsApp (kurir & pembayaran diatur admin)
  courierCode: z.string().min(2).max(20).optional(),
  serviceCode: z.string().min(1).max(30).optional(),
  paymentMethod: z.string().refine((m) => m in PAYMENT_METHODS, "Metode pembayaran tidak valid").optional(),
  couponCode: z.string().max(30).optional(),
  note: z.string().trim().max(300).optional(),
});
export type PlaceOrderInput = z.input<typeof orderSchema>;
type PlaceOrderResult = { ok: true; orderNumber: string; token: string } | { ok: false; error: string };

class CheckoutError extends Error {}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data checkout tidak valid." };
  const data = parsed.data;
  const manual = isWhatsAppCheckout();
  if (!manual && (!data.courierCode || !data.serviceCode)) return { ok: false, error: "Pilih layanan pengiriman." };
  if (!manual && !data.paymentMethod) return { ok: false, error: "Pilih metode pembayaran." };

  const { session } = await getCartOwner();
  const user = session?.user ?? null;
  if (!user && !data.contact) return { ok: false, error: "Isi email dan nama untuk checkout sebagai tamu." };

  // 1. Alamat tujuan (alamat tersimpan milik user, atau alamat baru).
  //    Mode WhatsApp: alamat ditulis bebas di `street` (tanpa kecamatan/area Biteship).
  let dest: Destination | null = null;
  let newAddress: z.infer<typeof addressSchema> | null = null;
  if (data.addressId && user) {
    const a = await prisma.address.findFirst({ where: { id: data.addressId, userId: user.id } });
    if (a && (manual || a.areaId)) dest = a;
  } else if (data.address) {
    if (manual) {
      const m = manualAddressSchema.safeParse(data.address);
      if (!m.success) return { ok: false, error: m.error.issues[0].message };
      dest = { ...m.data, province: "", city: "", district: "", postalCode: "", areaId: null };
    } else {
      const a = addressSchema.omit({ label: true, isDefault: true }).safeParse(data.address);
      if (!a.success) return { ok: false, error: a.error.issues[0].message };
      newAddress = { ...a.data, label: "Rumah" };
      dest = newAddress;
    }
  }
  if (!dest || (!manual && !dest.areaId)) return { ok: false, error: "Alamat pengiriman belum lengkap." };

  // 2. Keranjang & validasi stok
  const { lines, cartId } = await loadCart();
  if (!lines.length || !cartId) return { ok: false, error: "Keranjang Anda kosong." };
  const bad = lines.find((l) => l.issue);
  if (bad) return { ok: false, error: `Stok "${bad.productName} - ${bad.colorName}" berubah. Periksa keranjang Anda.` };
  const sum = summarize(lines);

  // 3. Ongkir dihitung ulang dari Biteship (harga dari klien tidak dipercaya).
  //    Mode WhatsApp: ongkir 0 dulu, admin mengisinya saat mengonfirmasi pembayaran.
  let rate: Rate | undefined;
  if (manual) {
    rate = { courierCode: "", courierName: "", serviceCode: "", serviceName: "Dikonfirmasi admin", price: 0, etd: "" };
  } else {
    try {
      rate = (await getRates(dest.areaId!, rateItems(lines))).find((r) => r.courierCode === data.courierCode && r.serviceCode === data.serviceCode);
    } catch {
      return { ok: false, error: "Gagal menghitung ongkir. Coba lagi." };
    }
    if (!rate) return { ok: false, error: "Layanan kurir tidak tersedia lagi. Pilih ulang pengiriman." };
  }

  // 4. Total & kupon
  const email = user?.email ?? data.contact!.email;
  const totals = await computeTotals({ subtotal: sum.subtotal, shippingCost: rate.price, couponCode: data.couponCode, userId: user?.id, email });
  if (data.couponCode && totals.couponError) return { ok: false, error: totals.couponError };

  const settings = await getStoreSettings();
  const orderNumber = newOrderNumber();
  // Mode WhatsApp: tanpa batas bayar → tidak dibatalkan otomatis oleh cron; admin yang membatalkan.
  const paymentExpiresAt = manual ? null : new Date(Date.now() + settings.paymentTimeoutMins * 60_000);
  const accessToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  // 5. Transaksi: potong stok secara atomik, kuota kupon, buat pesanan, kosongkan keranjang
  try {
    await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        const res = await tx.productVariant.updateMany({ where: { id: l.variantId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
        if (res.count !== 1) throw new CheckoutError(`Stok "${l.productName} - ${l.colorName}" tidak mencukupi.`);
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: l.variantId }, select: { stock: true } });
        await tx.stockMovement.create({ data: { variantId: l.variantId, change: -l.quantity, balance: v.stock, reason: "ORDER", note: orderNumber, userId: user?.id } });
      }
      if (totals.coupon) {
        const c = await tx.coupon.findUniqueOrThrow({ where: { id: totals.coupon.id } });
        const res = await tx.coupon.updateMany({
          where: { id: c.id, ...(c.quota != null && { usedCount: { lt: c.quota } }) },
          data: { usedCount: { increment: 1 } },
        });
        if (res.count !== 1) throw new CheckoutError("Kuota kupon baru saja habis.");
      }
      await tx.order.create({
        data: {
          orderNumber,
          accessToken,
          userId: user?.id,
          email,
          customerName: user?.name ?? data.contact!.customerName,
          phone: dest.phone,
          recipientName: dest.recipientName,
          province: dest.province,
          city: dest.city,
          district: dest.district,
          postalCode: dest.postalCode,
          street: dest.street,
          areaId: dest.areaId,
          courierCode: rate.courierCode,
          courierService: rate.serviceName,
          courierEtd: rate.etd || null,
          totalWeightGram: sum.weightGram,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingCost: totals.shippingCost,
          shippingDiscount: totals.shippingDiscount,
          total: totals.total,
          couponId: totals.coupon?.id,
          couponCode: totals.coupon?.code,
          paymentMethod: data.paymentMethod ?? null,
          paymentExpiresAt,
          customerNote: data.note || null,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              colorName: l.colorName,
              sku: l.sku,
              imageUrl: l.image,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              weightGram: l.weightGram,
            })),
          },
          history: { create: { status: "PENDING_PAYMENT", note: manual ? "Pesanan dibuat — menunggu konfirmasi admin via WhatsApp" : "Pesanan dibuat" } },
        },
      });
      await tx.cartItem.deleteMany({ where: { cartId } });
      // Alamat bebas (mode WhatsApp) tidak disimpan: tanpa kecamatan, tidak bisa dipakai menghitung ongkir nanti
      if (user && newAddress && data.saveAddress) {
        const count = await tx.address.count({ where: { userId: user.id } });
        if (count < 10) await tx.address.create({ data: { ...newAddress, isDefault: count === 0, userId: user.id } });
      }
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    console.error("[checkout]", e);
    return { ok: false, error: "Pesanan gagal dibuat. Silakan coba lagi." };
  }

  updateTag(TAGS.products); // stok berubah → halaman produk segar

  const link = `${site.url}/pesanan/${orderNumber}?token=${accessToken}`;
  const customerName = user?.name ?? data.contact!.customerName;
  const shippingRow = manual
    ? `<tr><td style="padding-top:12px;border-top:1px solid #eee">Ongkir</td><td align="right" style="padding-top:12px;border-top:1px solid #eee">dikonfirmasi admin</td></tr>`
    : `<tr><td style="padding-top:12px;border-top:1px solid #eee">Ongkir (${escapeHtml(rate.courierName)} ${escapeHtml(rate.serviceName)})</td><td align="right" style="padding-top:12px;border-top:1px solid #eee">${rupiah(totals.shippingCost - totals.shippingDiscount)}</td></tr>`;
  await sendEmail({
    to: email,
    subject: manual ? `Pesanan ${orderNumber} diterima — menunggu konfirmasi admin` : `Pesanan ${orderNumber} diterima — menunggu pembayaran`,
    text: manual
      ? `Terima kasih! Pesanan ${orderNumber} (${rupiah(totals.total)} belum termasuk ongkir) sudah kami terima. Admin akan menghubungi Anda via WhatsApp untuk ongkir & pembayaran. Status: ${link}`
      : `Terima kasih! Pesanan ${orderNumber} sebesar ${rupiah(totals.total)} menunggu pembayaran. Lihat & bayar: ${link}`,
    html: emailLayout(
      `Pesanan ${orderNumber} diterima`,
      `<p>Terima kasih telah berbelanja di Zel Shop.</p>
       <table width="100%" style="font-size:14px;border-collapse:collapse">${lines
         .map((l) => `<tr><td style="padding:6px 0">${escapeHtml(l.productName)} (${escapeHtml(l.colorName)}) × ${l.quantity}</td><td align="right">${rupiah(l.unitPrice * l.quantity)}</td></tr>`)
         .join("")}
       ${shippingRow}
       ${totals.discount ? `<tr><td>Diskon</td><td align="right">-${rupiah(totals.discount)}</td></tr>` : ""}
       <tr><td style="font-weight:bold;padding-top:6px">Total${manual ? " (belum termasuk ongkir)" : ""}</td><td align="right" style="font-weight:bold">${rupiah(totals.total)}</td></tr></table>
       ${manual ? `<p>Admin kami akan menghubungi Anda via WhatsApp untuk konfirmasi ongkir dan cara pembayaran.</p>` : ""}
       <p><a href="${link}" style="display:inline-block;margin-top:16px;background:#5B2A45;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${manual ? "Lihat pesanan" : "Lihat pesanan & bayar"}</a></p>`,
    ),
  });

  const notifyData = { orderNumber, accessToken, email, customerName, phone: dest.phone, total: totals.total, paymentExpiresAt };
  if (manual) await notifyOrderCreatedManual(notifyData);
  else await notifyOrderCreated(notifyData);

  return { ok: true, orderNumber, token: accessToken };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
