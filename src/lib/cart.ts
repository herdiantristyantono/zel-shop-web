import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getSession } from "./auth";
import { activeFlashWhere, unitPrice } from "./pricing";
import { prisma } from "./prisma";

export const CART_COOKIE = "zel_cart";
export const MAX_QTY_PER_ITEM = 20;

/** Identitas keranjang saat ini: user login atau token tamu dari cookie. */
export async function getCartOwner() {
  await connection();
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  return { userId: session?.user.id ?? null, guestToken: jar.get(CART_COOKIE)?.value ?? null, session };
}

/**
 * Ambil keranjang. Jika user login dan masih ada keranjang tamu di cookie,
 * isinya digabung ke keranjang akun (jumlah dijumlahkan, dibatasi stok).
 * Aman terhadap request paralel: keranjang tamu "diklaim" secara atomik.
 */
export async function findCart(create = false): Promise<{ id: string } | null> {
  const { userId, guestToken } = await getCartOwner();
  if (userId) {
    if (guestToken) await mergeGuestCart(userId, guestToken);
    const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    if (cart || !create) return cart;
    return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
  }
  if (guestToken) {
    const cart = await prisma.cart.findUnique({ where: { guestToken }, select: { id: true } });
    if (cart || !create) return cart;
  }
  if (!create) return null;
  // Hanya boleh dipanggil dari Server Action / Route Handler (bisa set cookie)
  const token = crypto.randomUUID();
  const cart = await prisma.cart.create({ data: { guestToken: token }, select: { id: true } });
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart;
}

async function mergeGuestCart(userId: string, guestToken: string) {
  const guest = await prisma.cart.findUnique({ where: { guestToken }, select: { id: true } });
  if (!guest) return;
  await prisma.$transaction(async (tx) => {
    // Klaim: hanya satu transaksi yang berhasil mengosongkan guestToken
    const claimed = await tx.cart.updateMany({ where: { id: guest.id, guestToken }, data: { guestToken: null } });
    if (claimed.count !== 1) return;
    const target = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
    const items = await tx.cartItem.findMany({ where: { cartId: guest.id }, include: { variant: { select: { stock: true } } } });
    for (const item of items) {
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } } });
      const qty = Math.min((existing?.quantity ?? 0) + item.quantity, item.variant.stock, MAX_QTY_PER_ITEM);
      if (qty <= 0) continue;
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        update: { quantity: qty },
        create: { cartId: target.id, variantId: item.variantId, quantity: qty },
      });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  colorName: string;
  colorHex: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  stock: number;
  weightGram: number;
  /** Masalah stok realtime: null = aman */
  issue: null | "OUT_OF_STOCK" | "INSUFFICIENT" | "UNAVAILABLE";
};

export async function getCartLines(cartId: string): Promise<CartLine[]> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
              flashSaleItems: { where: activeFlashWhere(), take: 1, select: { salePrice: true, quota: true, soldCount: true } },
            },
          },
        },
      },
    },
  });
  return items.map((i) => {
    const v = i.variant;
    const p = v.product;
    const price = unitPrice({ price: p.price, priceOverride: v.priceOverride, flash: p.flashSaleItems[0] });
    const normal = v.priceOverride ?? p.compareAtPrice ?? p.price;
    const available = p.isPublished && v.isActive;
    return {
      id: i.id,
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      colorName: v.colorName,
      colorHex: v.colorHex,
      sku: v.sku,
      image: v.images[0]?.url ?? p.images[0]?.url ?? null,
      unitPrice: price,
      compareAtPrice: normal > price ? normal : null,
      quantity: i.quantity,
      stock: v.stock,
      weightGram: p.weightGram,
      issue: !available ? "UNAVAILABLE" : v.stock === 0 ? "OUT_OF_STOCK" : v.stock < i.quantity ? "INSUFFICIENT" : null,
    };
  });
}

export function summarize(lines: CartLine[]) {
  const ok = lines.filter((l) => !l.issue);
  return {
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: ok.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
    savings: ok.reduce((n, l) => n + (l.compareAtPrice ? (l.compareAtPrice - l.unitPrice) * l.quantity : 0), 0),
    weightGram: ok.reduce((n, l) => n + l.weightGram * l.quantity, 0),
    hasIssues: lines.some((l) => l.issue),
  };
}

/** Untuk Server Component: keranjang + ringkasan (tanpa membuat keranjang baru). Di-dedupe per request. */
export const getCart = cache(async () => {
  const cart = await findCart(false);
  const lines = cart ? await getCartLines(cart.id) : [];
  return { cartId: cart?.id ?? null, lines, summary: summarize(lines) };
});
