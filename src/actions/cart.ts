"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { findCart, MAX_QTY_PER_ITEM } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const addSchema = z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM) });

export async function addToCart(input: { variantId: string; quantity: number }): Promise<ActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };
  const { variantId, quantity } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, isActive: true, product: { select: { isPublished: true } } },
  });
  if (!variant || !variant.isActive || !variant.product.isPublished) return { ok: false, error: "Produk tidak tersedia." };

  const cart = await findCart(true);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart!.id, variantId } } });
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > variant.stock) {
    return { ok: false, error: variant.stock === 0 ? "Stok habis." : `Stok tersisa ${variant.stock}${existing ? `, di keranjang sudah ${existing.quantity}` : ""}.` };
  }
  if (next > MAX_QTY_PER_ITEM) return { ok: false, error: `Maksimal ${MAX_QTY_PER_ITEM} per produk.` };

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart!.id, variantId } },
    update: { quantity: next },
    create: { cartId: cart!.id, variantId, quantity },
  });
  await prisma.cart.update({ where: { id: cart!.id }, data: { updatedAt: new Date() } });
  refresh();
  return { ok: true, message: "Ditambahkan ke keranjang" };
}

async function ownedItem(itemId: string) {
  const cart = await findCart(false);
  if (!cart) return null;
  return prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { select: { stock: true } } } });
}

export async function updateCartItem(itemId: string, quantity: number): Promise<ActionResult> {
  if (typeof itemId !== "string" || !Number.isInteger(quantity) || quantity < 0) return { ok: false, error: "Data tidak valid." };
  const item = await ownedItem(itemId);
  if (!item) return { ok: false, error: "Item tidak ditemukan." };
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const q = Math.min(quantity, item.variant.stock, MAX_QTY_PER_ITEM);
    if (q <= 0) return { ok: false, error: "Stok habis." };
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: q } });
    if (q < quantity) {
      refresh();
      return { ok: false, error: `Stok tersisa ${item.variant.stock}.` };
    }
  }
  refresh();
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  return updateCartItem(itemId, 0);
}
