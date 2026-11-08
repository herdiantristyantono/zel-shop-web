"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin";
import { TAGS } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

/** Hitung ulang rata-rata rating produk dari ulasan yang disetujui. */
async function recompute(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  const p = await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
    select: { slug: true },
  });
  updateTag(TAGS.products);
  updateTag(`product:${p.slug}`);
}

export async function setReviewStatus(id: string, status: "APPROVED" | "HIDDEN" | "PENDING") {
  return adminAction("reviews", async () => {
    if (!["APPROVED", "HIDDEN", "PENDING"].includes(status)) return { ok: false, error: "Status tidak valid." };
    const r = await prisma.review.update({ where: { id }, data: { status }, select: { productId: true } });
    await recompute(r.productId);
    refresh();
    return { ok: true };
  });
}

export async function replyReview(id: string, reply: string) {
  return adminAction("reviews", async () => {
    const text = z.string().trim().max(1000).safeParse(reply);
    if (!text.success) return { ok: false, error: "Balasan maksimal 1000 karakter." };
    const r = await prisma.review.update({ where: { id }, data: { adminReply: text.data || null, repliedAt: text.data ? new Date() : null }, select: { productId: true } });
    await recompute(r.productId);
    refresh();
    return { ok: true, message: "Balasan disimpan." };
  });
}
