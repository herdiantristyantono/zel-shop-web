import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";
import { PageHeader, Skeleton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ubah produk" };

export default function EditProductPage({ params }: PageProps<"/admin/produk/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("products");
  const { id } = await params;
  const [p, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  const s = (n: number | null | undefined) => (n == null ? "" : String(n));
  const initial: ProductFormValue = {
    id: p.id, name: p.name, slug: p.slug, categoryId: p.categoryId, description: p.description, material: p.material, size: p.size,
    lengthCm: s(p.lengthCm), widthCm: s(p.widthCm), heightCm: s(p.heightCm), weightGram: s(p.weightGram), cardSlots: s(p.cardSlots), compartments: p.compartments ?? "",
    price: s(p.price), compareAtPrice: s(p.compareAtPrice), isPublished: p.isPublished, isFeatured: p.isFeatured, minStockAlert: s(p.minStockAlert),
    metaTitle: p.metaTitle ?? "", metaDescription: p.metaDescription ?? "",
    variants: p.variants.map((v) => ({ key: v.id, id: v.id, colorName: v.colorName, colorHex: v.colorHex, sku: v.sku, stock: s(v.stock), priceOverride: s(v.priceOverride), isActive: v.isActive })),
    images: p.images.map((i) => ({ key: i.id, id: i.id, url: i.url, alt: i.alt, variantRef: i.variantId, width: i.width, height: i.height })),
  };
  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: "/admin/produk", label: "Produk" }}
        actions={p.isPublished ? <Link href={`/produk/${p.slug}`} target="_blank" className="btn-outline">Lihat di toko ↗</Link> : undefined}
      />
      <ProductForm initial={initial} categories={categories} />
    </>
  );
}
