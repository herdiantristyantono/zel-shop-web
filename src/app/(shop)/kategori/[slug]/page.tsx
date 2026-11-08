import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";
import { getCategories, getCategory } from "@/lib/catalog";

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.length ? cats.map((c) => ({ slug: c.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/kategori/[slug]">): Promise<Metadata> {
  const cat = await getCategory((await params).slug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description ?? `Koleksi ${cat.name} wanita di Zel Shop.`,
    alternates: { canonical: `/kategori/${cat.slug}` },
    openGraph: { title: `${cat.name} | Zel Shop`, images: cat.imageUrl ? [cat.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/kategori/[slug]">) {
  const cat = await getCategory((await params).slug);
  if (!cat || !cat.isActive) notFound();
  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:text-plum">Beranda</Link> / <Link href="/produk" className="hover:text-plum">Produk</Link> / <span className="text-ink">{cat.name}</span>
      </nav>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">{cat.name}</h1>
        {cat.description && <p className="mt-3 text-muted">{cat.description}</p>}
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogView searchParams={searchParams} category={cat.slug} />
      </Suspense>
    </div>
  );
}
