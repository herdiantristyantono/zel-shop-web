import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { getStoreSettings } from "./settings";

type Db = Prisma.TransactionClient | typeof prisma;

export type Totals = {
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingDiscount: number;
  total: number;
  coupon: { id: string; code: string; description: string | null } | null;
  couponError: string | null;
  freeShippingApplied: boolean;
};

/**
 * Hitung total akhir di server. Semua nominal dari klien diabaikan.
 * Urutan: diskon kupon (subtotal) → gratis ongkir toko → kupon gratis ongkir (tidak dobel).
 */
export async function computeTotals(
  opts: { subtotal: number; shippingCost: number; couponCode?: string | null; userId?: string | null; email?: string | null },
  db: Db = prisma,
): Promise<Totals> {
  const { subtotal, shippingCost } = opts;
  let discount = 0;
  let shippingDiscount = 0;
  let coupon: Totals["coupon"] = null;
  let couponError: string | null = null;

  const settings = await getStoreSettings();
  let freeShippingApplied = false;
  if (settings.freeShippingMin != null && subtotal >= settings.freeShippingMin) {
    shippingDiscount = Math.min(shippingCost, settings.freeShippingMax ?? shippingCost);
    freeShippingApplied = true;
  }

  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    const c = await db.coupon.findUnique({ where: { code } });
    const now = new Date();
    if (!c || !c.isActive) couponError = "Kode kupon tidak ditemukan.";
    else if (c.startsAt > now || c.endsAt <= now) couponError = "Kode kupon sudah tidak berlaku.";
    else if (c.quota != null && c.usedCount >= c.quota) couponError = "Kuota kupon sudah habis.";
    else if (subtotal < c.minPurchase) couponError = `Minimal belanja Rp ${c.minPurchase.toLocaleString("id-ID")} untuk kupon ini.`;
    else {
      const who: Prisma.OrderWhereInput[] = [];
      if (opts.userId) who.push({ userId: opts.userId });
      if (opts.email) who.push({ email: { equals: opts.email, mode: "insensitive" } });
      const used = who.length ? await db.order.count({ where: { couponId: c.id, status: { not: "CANCELLED" }, OR: who } }) : 0;
      if (used >= c.perUserLimit) couponError = "Anda sudah memakai kupon ini.";
      else {
        coupon = { id: c.id, code: c.code, description: c.description };
        if (c.type === "PERCENT") discount = Math.floor((subtotal * c.value) / 100);
        if (c.type === "FIXED") discount = c.value;
        if (c.maxDiscount != null && c.type !== "FREE_SHIPPING") discount = Math.min(discount, c.maxDiscount);
        discount = Math.min(discount, subtotal);
        if (c.type === "FREE_SHIPPING") {
          const extra = Math.min(shippingCost, c.maxDiscount ?? shippingCost);
          if (extra <= shippingDiscount) couponError = "Pesanan ini sudah mendapat gratis ongkir.";
          shippingDiscount = Math.max(shippingDiscount, extra);
          if (couponError) coupon = null;
        }
      }
    }
  }
  const total = Math.max(0, subtotal - discount + shippingCost - shippingDiscount);
  return { subtotal, discount, shippingCost, shippingDiscount, total, coupon, couponError, freeShippingApplied };
}
