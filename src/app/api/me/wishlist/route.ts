import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** ID produk di wishlist user saat ini (untuk status tombol hati). */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ ids: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const rows = await prisma.wishlistItem.findMany({ where: { userId: session.user.id }, select: { productId: true } });
  return Response.json({ ids: rows.map((r) => r.productId) }, { headers: { "Cache-Control": "private, no-store" } });
}
