import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WishlistItemCard } from "@/components/account/WishlistItemCard";
import { getSession } from "@/lib/auth";
import { activeFlashWhere, unitPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Wishlist</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-blush" />}>
        <WishlistContent />
      </Suspense>
    </div>
  );
}

async function WishlistContent() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/wishlist");
  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id, product: { isPublished: true } },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, colorName: true, colorHex: true, stock: true } },
          flashSaleItems: { where: activeFlashWhere(), take: 1, select: { salePrice: true, quota: true, soldCount: true } },
        },
      },
    },
  });
  if (!items.length)
    return (
      <div className="mt-8 rounded-[var(--radius-card)] bg-blush px-6 py-16 text-center">
        <h2 className="text-2xl">Wishlist masih kosong</h2>
        <p className="mt-2 text-muted">Tekan ikon hati di halaman produk untuk menyimpannya di sini.</p>
        <Link href="/produk" className="btn-primary mt-6">Jelajahi produk</Link>
      </div>
    );
  return (
    <ul className="mt-8 grid gap-4 md:grid-cols-2">
      {items.map(({ product: p, notifyOnSale, notifyOnRestock }) => {
        const price = unitPrice({ price: p.price, flash: p.flashSaleItems[0] });
        const compareAt = p.compareAtPrice ?? p.price;
        return (
          <WishlistItemCard
            key={p.id}
            item={{
              productId: p.id,
              name: p.name,
              slug: p.slug,
              image: p.images[0] ?? null,
              price,
              compareAt: compareAt > price ? compareAt : null,
              variants: p.variants,
              notifyOnSale,
              notifyOnRestock,
            }}
          />
        );
      })}
    </ul>
  );
}
