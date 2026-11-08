import "server-only";
import { prisma } from "./prisma";

export const MAX_REVIEW_PHOTOS = 3;

/** Item pesanan milik pengguna, pesanan sudah selesai, dan belum diulas. */
export async function findReviewableItem(userId: string, orderItemId: string) {
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { userId, status: "COMPLETED" } },
    select: { id: true, productId: true, review: { select: { id: true } } },
  });
  if (!item || !item.productId || item.review) return null;
  return { id: item.id, productId: item.productId };
}
