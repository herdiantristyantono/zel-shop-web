import type { Metadata } from "next";
import { Suspense } from "react";
import { emptyProduct, ProductForm } from "@/components/admin/ProductForm";
import { PageHeader, Skeleton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Produk baru" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Produk baru" back={{ href: "/admin/produk", label: "Produk" }} />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Loader />
      </Suspense>
    </>
  );
}

async function Loader() {
  await requireStaff("products");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return <ProductForm initial={emptyProduct} categories={categories} />;
}
