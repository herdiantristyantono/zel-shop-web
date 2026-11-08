"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin";
import { fieldErrors } from "@/lib/admin-validation";
import { TAGS } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { fromWibInput } from "@/lib/wib";

const wib = z.string().transform((v, ctx) => {
  const d = fromWibInput(v);
  if (!d) ctx.addIssue({ code: "custom", message: "Tanggal tidak valid" });
  return d as Date;
});
const optWib = z.string().optional().transform((v) => (v ? fromWibInput(v) : null));
const int = (min = 0, max = 100_000_000) => z.coerce.number().int().min(min).max(max);
const optInt = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(0).max(100_000_000).nullable());

function bust() {
  updateTag(TAGS.home);
  updateTag(TAGS.products);
  refresh();
}

// ───────────── Kupon ─────────────

const couponSchema = z
  .object({
    id: z.string().max(40).optional(),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Kode 3–20 huruf/angka tanpa spasi"),
    description: z.string().trim().max(160).optional(),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: int(0),
    maxDiscount: optInt,
    minPurchase: int(0),
    quota: optInt,
    perUserLimit: int(1, 100),
    startsAt: wib,
    endsAt: wib,
    isActive: z.boolean(),
  })
  .refine((c) => c.endsAt > c.startsAt, { path: ["endsAt"], message: "Harus setelah tanggal mulai" })
  .refine((c) => c.type !== "PERCENT" || (c.value >= 1 && c.value <= 100), { path: ["value"], message: "Persen 1–100" })
  .refine((c) => c.type !== "FIXED" || c.value >= 1000, { path: ["value"], message: "Potongan minimal Rp 1.000" });

export async function saveCoupon(input: z.input<typeof couponSchema>) {
  return adminAction("promo", async () => {
    const p = couponSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Periksa isian kupon.", fieldErrors: fieldErrors(p.error) };
    const { id, ...data } = p.data;
    const clean = { ...data, description: data.description || null, value: data.type === "FREE_SHIPPING" ? 0 : data.value };
    if (id) await prisma.coupon.update({ where: { id }, data: clean });
    else await prisma.coupon.create({ data: clean });
    bust();
    return { ok: true, message: "Kupon disimpan." };
  });
}

export async function deleteCoupon(id: string) {
  return adminAction("promo", async () => {
    const used = await prisma.order.count({ where: { couponId: id } });
    if (used) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      bust();
      return { ok: true, message: "Kupon sudah pernah dipakai, jadi dinonaktifkan (bukan dihapus)." };
    }
    await prisma.coupon.delete({ where: { id } });
    bust();
    return { ok: true, message: "Kupon dihapus." };
  });
}

// ───────────── Flash sale ─────────────

const flashSchema = z
  .object({
    id: z.string().max(40).optional(),
    name: z.string().trim().min(3, "Nama minimal 3 karakter").max(80),
    startsAt: wib,
    endsAt: wib,
    isActive: z.boolean(),
    items: z.array(z.object({ productId: z.string().min(1).max(40), salePrice: int(1000), quota: optInt })).min(1, "Tambahkan minimal 1 produk").max(100),
  })
  .refine((f) => f.endsAt > f.startsAt, { path: ["endsAt"], message: "Harus setelah waktu mulai" });

export async function saveFlashSale(input: z.input<typeof flashSchema>) {
  return adminAction("promo", async () => {
    const p = flashSchema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0].message, fieldErrors: fieldErrors(p.error) };
    const { id, items, ...data } = p.data;
    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, select: { id: true, name: true, price: true } });
    for (const it of items) {
      const prod = products.find((x) => x.id === it.productId);
      if (!prod) return { ok: false, error: "Produk tidak ditemukan." };
      if (it.salePrice >= prod.price) return { ok: false, error: `Harga flash "${prod.name}" harus di bawah harga jual (${prod.price}).` };
    }
    await prisma.$transaction(async (tx) => {
      const sale = id ? await tx.flashSale.update({ where: { id }, data }) : await tx.flashSale.create({ data });
      const existing = await tx.flashSaleItem.findMany({ where: { flashSaleId: sale.id } });
      await tx.flashSaleItem.deleteMany({ where: { flashSaleId: sale.id, productId: { notIn: items.map((i) => i.productId) } } });
      for (const it of items) {
        const old = existing.find((e) => e.productId === it.productId);
        if (old) await tx.flashSaleItem.update({ where: { id: old.id }, data: { salePrice: it.salePrice, quota: it.quota } });
        else await tx.flashSaleItem.create({ data: { flashSaleId: sale.id, productId: it.productId, salePrice: it.salePrice, quota: it.quota } });
      }
    });
    bust();
    return { ok: true, message: "Flash sale disimpan." };
  });
}

export async function deleteFlashSale(id: string) {
  return adminAction("promo", async () => {
    await prisma.flashSale.delete({ where: { id } });
    bust();
    return { ok: true, message: "Flash sale dihapus." };
  });
}

// ───────────── Banner ─────────────

const bannerSchema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(80),
  subtitle: z.string().trim().max(160).optional(),
  imageUrl: z.string().min(1, "Unggah gambar banner").max(500),
  mobileImageUrl: z.string().max(500).optional(),
  linkUrl: z
    .string()
    .trim()
    .max(300)
    .refine((u) => !u || u.startsWith("/") || u.startsWith("https://"), "Tautan harus diawali / atau https://")
    .optional(),
  ctaLabel: z.string().trim().max(30).optional(),
  sortOrder: int(0, 999),
  isActive: z.boolean(),
  startsAt: optWib,
  endsAt: optWib,
});

export async function saveBanner(input: z.input<typeof bannerSchema>) {
  return adminAction("promo", async () => {
    const p = bannerSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Periksa isian banner.", fieldErrors: fieldErrors(p.error) };
    const { id, ...d } = p.data;
    const data = { ...d, subtitle: d.subtitle || null, mobileImageUrl: d.mobileImageUrl || null, linkUrl: d.linkUrl || null, ctaLabel: d.ctaLabel || null };
    if (id) await prisma.banner.update({ where: { id }, data });
    else await prisma.banner.create({ data });
    bust();
    return { ok: true, message: "Banner disimpan." };
  });
}

export async function deleteBanner(id: string) {
  return adminAction("promo", async () => {
    await prisma.banner.delete({ where: { id } });
    bust();
    return { ok: true, message: "Banner dihapus." };
  });
}
