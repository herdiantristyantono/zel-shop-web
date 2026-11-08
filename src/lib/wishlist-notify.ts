import "server-only";
import { emailLayout, sendEmail } from "./email";
import { rupiah } from "./format";
import { prisma } from "./prisma";
import { site } from "./site";
import { sendWhatsApp } from "./whatsapp";

const COOLDOWN = 24 * 3600_000;

/** Kabari pengguna yang menyimpan produk di wishlist saat diskon / stok kembali (maks. 1×/24 jam per produk). */
export async function notifyWishlist(productId: string, kind: "sale" | "restock") {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, price: true, compareAtPrice: true, isPublished: true } });
  if (!product?.isPublished) return 0;
  const since = new Date(Date.now() - COOLDOWN);
  const rows = await prisma.wishlistItem.findMany({
    where: {
      productId,
      ...(kind === "sale" ? { notifyOnSale: true } : { notifyOnRestock: true }),
      OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: since } }],
      user: { banned: false },
    },
    include: { user: { select: { name: true, email: true, phone: true } } },
    take: 500,
  });
  const url = `${site.url}/produk/${product.slug}`;
  const headline = kind === "sale" ? `${product.name} sedang diskon!` : `${product.name} tersedia lagi!`;
  const detail = kind === "sale" && product.compareAtPrice ? `Sekarang ${rupiah(product.price)} (sebelumnya ${rupiah(product.compareAtPrice)}).` : kind === "sale" ? `Sekarang ${rupiah(product.price)}.` : "Stoknya terbatas — amankan sebelum habis lagi.";
  for (const r of rows) {
    await sendEmail({
      to: r.user.email,
      subject: headline,
      text: `Halo ${r.user.name}, ${headline} ${detail} ${url}`,
      html: emailLayout(headline, `<p>Halo ${r.user.name},</p><p>Produk di wishlist Anda: <strong>${product.name}</strong>. ${detail}</p><p><a href="${url}" style="display:inline-block;background:#5B2A45;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Lihat produk</a></p><p style="font-size:12px;color:#6B5560">Atur notifikasi di halaman Wishlist.</p>`),
    });
    if (r.user.phone) await sendWhatsApp(r.user.phone, `Halo ${r.user.name}, ${headline} ${detail}\n${url}`);
  }
  if (rows.length) await prisma.wishlistItem.updateMany({ where: { productId, userId: { in: rows.map((r) => r.userId) } }, data: { lastNotifiedAt: new Date() } });
  return rows.length;
}
