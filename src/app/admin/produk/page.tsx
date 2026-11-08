import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublishToggle } from "@/components/admin/PublishToggle";
import { Badge, EmptyState, PageHeader, Pagination, Skeleton, Table } from "@/components/admin/ui";
import { ProductImage } from "@/components/ProductImage";
import type { Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/admin";
import { rupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Produk" };
const PER = 20;

export default function ProductsAdminPage(props: PageProps<"/admin/produk">) {
  return (
    <>
      <PageHeader
        title="Produk"
        actions={
          <>
            <a href="/api/admin/products.csv" className="btn-outline">Export CSV</a>
            <Link href="/admin/stok#import" className="btn-outline">Import CSV</Link>
            <Link href="/admin/produk/baru" className="btn-primary">+ Produk baru</Link>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProductList {...props} />
      </Suspense>
    </>
  );
}

async function ProductList({ searchParams }: PageProps<"/admin/produk">) {
  await requireStaff("products");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const cat = typeof sp.kategori === "string" ? sp.kategori : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] }),
    ...(cat && { categoryId: cat }),
    ...(status === "tampil" && { isPublished: true }),
    ...(status === "sembunyi" && { isPublished: false }),
    ...(status === "habis" && { variants: { every: { stock: 0 } } }),
  };
  const [rows, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      include: { category: { select: { name: true } }, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { select: { stock: true, isActive: true } } },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const qs = (p: number) => `?${new URLSearchParams({ ...(q && { q }), ...(cat && { kategori: cat }), ...(status && { status }), page: String(p) })}`;

  return (
    <>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="pq">Cari produk</label>
        <input id="pq" name="q" defaultValue={q} placeholder="Cari nama atau SKU" className="input max-w-xs" />
        <label className="sr-only" htmlFor="pk">Kategori</label>
        <select id="pk" name="kategori" defaultValue={cat} className="input w-auto">
          <option value="">Semua kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="ps">Status</label>
        <select id="ps" name="status" defaultValue={status} className="input w-auto">
          <option value="">Semua status</option>
          <option value="tampil">Tampil</option>
          <option value="sembunyi">Tersembunyi</option>
          <option value="habis">Stok habis</option>
        </select>
        <button className="btn-outline">Terapkan</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada produk">Ubah filter atau tambahkan produk baru.</EmptyState>
      ) : (
        <Table label="Daftar produk">
          <thead><tr><th>Produk</th><th>Kategori</th><th className="text-right">Harga</th><th className="text-right">Stok</th><th>Tampil</th><th><span className="sr-only">Aksi</span></th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const stock = p.variants.filter((v) => v.isActive).reduce((n, v) => n + v.stock, 0);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-blush">
                        {p.images[0] && <ProductImage src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span>
                        <Link href={`/admin/produk/${p.id}`} className="font-medium text-ink hover:text-plum">{p.name}</Link>
                        <span className="block text-xs text-muted">{p.variants.length} warna · {p.soldCount} terjual</span>
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">{p.category.name}</td>
                  <td className="text-right tabular-nums">
                    {rupiah(p.price)}
                    {p.compareAtPrice && <span className="block text-xs text-muted line-through">{rupiah(p.compareAtPrice)}</span>}
                  </td>
                  <td className="text-right">{stock === 0 ? <Badge tone="bad">Habis</Badge> : <span className="tabular-nums">{stock}</span>}</td>
                  <td><PublishToggle id={p.id} published={p.isPublished} name={p.name} /></td>
                  <td className="text-right"><Link href={`/admin/produk/${p.id}`} className="text-plum underline">Ubah</Link></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER)} href={qs} />
    </>
  );
}
