"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addToCart, type ActionResult } from "./cart";

export async function toggleWishlist(productId: string): Promise<{ ok: true; saved: boolean } | { ok: false; needLogin?: true; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, needLogin: true, error: "Masuk untuk menyimpan wishlist." };
  if (!z.string().min(1).max(40).safeParse(productId).success) return { ok: false, error: "Data tidak valid." };
  const userId = session.user.id;
  const key = { userId_productId: { userId, productId } };
  const existing = await prisma.wishlistItem.findUnique({ where: key });
  if (existing) {
    await prisma.wishlistItem.delete({ where: key });
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId, isPublished: true }, select: { id: true } });
    if (!product) return { ok: false, error: "Produk tidak ditemukan." };
    await prisma.wishlistItem.create({ data: { userId, productId } });
  }
  refresh();
  return { ok: true, saved: !existing };
}

/** Pindahkan dari wishlist ke keranjang (hapus dari wishlist jika berhasil). */
export async function moveWishlistToCart(productId: string, variantId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Silakan masuk." };
  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
  if (!variant) return { ok: false, error: "Varian tidak ditemukan." };
  const res = await addToCart({ variantId, quantity: 1 });
  if (res.ok) await prisma.wishlistItem.deleteMany({ where: { userId: session.user.id, productId } });
  refresh();
  return res;
}

export async function setWishlistNotify(productId: string, field: "notifyOnSale" | "notifyOnRestock", value: boolean) {
  const session = await getSession();
  if (!session || !["notifyOnSale", "notifyOnRestock"].includes(field)) return;
  await prisma.wishlistItem.updateMany({ where: { userId: session.user.id, productId }, data: { [field]: Boolean(value) } });
  refresh();
}
