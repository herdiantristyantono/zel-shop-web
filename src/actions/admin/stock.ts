"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { adminAction, can } from "@/lib/admin";
import { TAGS } from "@/lib/catalog";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { notifyWishlist } from "@/lib/wishlist-notify";

const adjustSchema = z.object({
  variantId: z.string().min(1).max(40),
  change: z.coerce
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((n) => n !== 0, "Jumlah tidak boleh 0"),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN"]),
  note: z.string().trim().max(200).optional(),
});

export async function adjustStock(input: z.input<typeof adjustSchema>) {
  return adminAction<{ stock: number }>("stock", async (user) => {
    const p = adjustSchema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const { variantId, change, reason, note } = p.data;
    const res = await prisma.$transaction(async (tx) => {
      const moved = await tx.productVariant.updateMany({
        where: { id: variantId, ...(change < 0 && { stock: { gte: -change } }) },
        data: { stock: { increment: change } },
      });
      if (moved.count !== 1) return null;
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true, productId: true } });
      await tx.stockMovement.create({ data: { variantId, change, balance: v.stock, reason, note: note || null, userId: user.id } });
      return v;
    });
    if (!res) return { ok: false, error: "Stok tidak mencukupi untuk dikurangi sebanyak itu." };
    updateTag(TAGS.products);
    if (change > 0 && res.stock === change) after(() => notifyWishlist(res.productId, "restock").then(() => undefined));
    refresh();
    return { ok: true, data: { stock: res.stock }, message: `Stok sekarang ${res.stock}.` };
  });
}

function toInt(v: string | undefined) {
  const t = (v ?? "").trim().replace(/^Rp/i, "").replace(/[.\s]/g, "");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/**
 * Import CSV (hasil export, boleh diedit di Excel). Berdasarkan SKU memperbarui: stok varian, harga varian,
 * serta harga / harga coret / status tampil produk. Staf Gudang hanya boleh mengubah stok.
 * Produk & varian baru dibuat lewat form agar foto & deskripsi lengkap.
 */
export async function importProductsCsv(text: string) {
  return adminAction<{ updated: number; skipped: number; errors: string[] }>("stock", async (user) => {
    if (typeof text !== "string" || text.length > 2_000_000) return { ok: false, error: "File terlalu besar (maks. 2 MB)." };
    const rows = parseCsv(text);
    if (rows.length < 2) return { ok: false, error: "File kosong atau tanpa baris data." };
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => head.indexOf(name);
    if (col("sku") < 0) return { ok: false, error: 'Kolom "sku" wajib ada.' };
    const canPrice = can(user.role, "products");

    const errors: string[] = [];
    let updated = 0;
    let skipped = 0;
    const restocked = new Set<string>();

    for (const [i, r] of rows.slice(1).entries()) {
      const line = i + 2;
      const sku = r[col("sku")]?.trim().toUpperCase();
      if (!sku) continue;
      const v = await prisma.productVariant.findUnique({ where: { sku }, include: { product: true } });
      if (!v) {
        errors.push(`Baris ${line}: SKU ${sku} tidak ditemukan`);
        continue;
      }
      const get = (name: string) => (col(name) >= 0 ? r[col(name)] : undefined);
      const stock = toInt(get("stock"));
      const price = canPrice ? toInt(get("price")) : undefined;
      const compare = canPrice ? toInt(get("compare_at_price")) : undefined;
      const vprice = canPrice ? toInt(get("variant_price")) : undefined;
      const pub = canPrice ? get("published")?.trim() : undefined;
      if ([stock, price, compare, vprice].some((n) => Number.isNaN(n))) {
        errors.push(`Baris ${line}: angka tidak valid`);
        continue;
      }
      if (price !== undefined && price < 1000) {
        errors.push(`Baris ${line}: harga minimal 1000`);
        continue;
      }

      let changed = false;
      await prisma.$transaction(async (tx) => {
        if (stock !== undefined && stock !== v.stock) {
          await tx.productVariant.update({ where: { id: v.id }, data: { stock } });
          await tx.stockMovement.create({ data: { variantId: v.id, change: stock - v.stock, balance: stock, reason: "ADJUSTMENT", note: "Import CSV", userId: user.id } });
          if (v.stock === 0 && stock > 0) restocked.add(v.productId);
          changed = true;
        }
        if (canPrice && col("variant_price") >= 0 && (vprice ?? null) !== v.priceOverride) {
          await tx.productVariant.update({ where: { id: v.id }, data: { priceOverride: vprice ?? null } });
          changed = true;
        }
        const pData: { price?: number; compareAtPrice?: number | null; isPublished?: boolean } = {};
        const finalPrice = price ?? v.product.price;
        if (price !== undefined && price !== v.product.price) pData.price = price;
        if (canPrice && col("compare_at_price") >= 0) {
          const nc = compare && compare > finalPrice ? compare : null;
          if (nc !== v.product.compareAtPrice) pData.compareAtPrice = nc;
        }
        if ((pub === "0" || pub === "1") && (pub === "1") !== v.product.isPublished) pData.isPublished = pub === "1";
        if (Object.keys(pData).length) {
          await tx.product.update({ where: { id: v.productId }, data: pData });
          changed = true;
        }
      });
      if (changed) updated++;
      else skipped++;
    }
    updateTag(TAGS.products);
    updateTag(TAGS.home);
    for (const id of restocked) after(() => notifyWishlist(id, "restock").then(() => undefined));
    refresh();
    return {
      ok: true,
      data: { updated, skipped, errors: errors.slice(0, 50) },
      message: `${updated} SKU diperbarui, ${skipped} tidak berubah${errors.length ? `, ${errors.length} error` : ""}.`,
    };
  });
}
