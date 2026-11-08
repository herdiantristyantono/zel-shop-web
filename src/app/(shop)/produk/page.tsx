import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Semua Produk",
  description: "Belanja dompet panjang, card holder, tas selempang, handbag, tote bag, ransel, dan clutch wanita di Zel Shop.",
  alternates: { canonical: "/produk" },
};

export default function ProductsPage({ searchParams }: PageProps<"/produk">) {
  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <p className="eyebrow mb-2">Katalog</p>
        <h1 className="text-4xl sm:text-5xl">Semua Produk</h1>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
