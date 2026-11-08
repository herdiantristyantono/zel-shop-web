import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CsvImport, StockAdjust } from "@/components/admin/StockTools";
import { Badge, Card, dateTime, EmptyState, PageHeader, Skeleton, Table } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Stok" };

const REASON: Record<string, string> = {
  INITIAL: "Stok awal",
  RESTOCK: "Barang masuk",
  ADJUSTMENT: "Penyesuaian",
  ORDER: "Pesanan",
  ORDER_CANCELLED: "Pesanan batal",
  RETURN: "Retur",
};

export default function StockPage(props: PageProps<"/admin/stok">) {
  return (
    <>
      <PageHeader title="Stok" description="Sesuaikan stok per warna, lihat riwayat keluar-masuk, dan import/export massal." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StockContent {...props} />
      </Suspense>
    </>
  );
}

async function StockContent({ searchParams }: PageProps<"/admin/stok">) {
  await requireStaff("stock");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const filter = typeof sp.filter === "string" ? sp.filter : "";

  const where: Prisma.ProductVariantWhereInput = {
    ...(q && { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }, { colorName: { contains: q, mode: "insensitive" } }] }),
    ...(filter === "habis" && { stock: 0 }),
  };
  const [variantsRaw, moves] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      take: 200,
      include: { product: { select: { id: true, name: true, minStockAlert: true } } },
    }),
    prisma.stockMovement.findMany({
      where: q ? { variant: { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }] } } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { variant: { select: { sku: true, colorName: true, product: { select: { name: true } } } }, user: { select: { name: true } } },
    }),
  ]);
  const variants = filter === "menipis" ? variantsRaw.filter((v) => v.stock <= v.product.minStockAlert) : variantsRaw;

  return (
    <div className="space-y-8">
      <form className="flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="sq">Cari</label>
        <input id="sq" name="q" defaultValue={q} placeholder="Cari SKU, produk, atau warna" className="input max-w-xs" />
        <label className="sr-only" htmlFor="sf">Filter</label>
        <select id="sf" name="filter" defaultValue={filter} className="input w-auto">
          <option value="">Semua</option>
          <option value="menipis">Stok menipis</option>
          <option value="habis">Stok habis</option>
        </select>
        <button className="btn-outline">Terapkan</button>
      </form>

      {variants.length === 0 ? (
        <EmptyState title="Tidak ada varian yang cocok" />
      ) : (
        <Table label="Stok per varian">
          <thead><tr><th>Produk / warna</th><th>SKU</th><th className="text-right">Stok</th><th>Ubah</th></tr></thead>
          <tbody>
            {variants.map((v) => {
              const low = v.stock <= v.product.minStockAlert;
              return (
                <tr key={v.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: v.colorHex }} aria-hidden />
                      <span className="text-ink">{v.product.name}</span>
                      <span className="text-muted">· {v.colorName}</span>
                      {!v.isActive && <Badge>Nonaktif</Badge>}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{v.sku}</td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      {v.stock === 0 ? <Badge tone="bad">Habis</Badge> : low ? <Badge tone="warn">Menipis</Badge> : null}
                      <span className="font-semibold tabular-nums">{v.stock}</span>
                    </span>
                  </td>
                  <td><StockAdjust variantId={v.id} label={`${v.product.name} ${v.colorName}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Card title="Riwayat stok (50 terakhir)">
        {moves.length === 0 ? (
          <p className="text-sm text-muted">Belum ada riwayat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-muted"><th className="py-2">Waktu</th><th>Varian</th><th>Alasan</th><th className="text-right">Perubahan</th><th className="text-right">Saldo</th><th>Oleh</th></tr></thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} className="border-t border-line/70">
                    <td className="py-2 text-muted">{dateTime.format(m.createdAt)}</td>
                    <td>{m.variant.product.name} · {m.variant.colorName} <span className="font-mono text-xs text-muted">{m.variant.sku}</span></td>
                    <td>
                      {REASON[m.reason] ?? m.reason}
                      {m.note && (m.note.startsWith("ZEL-") ? <Link href={`/admin/pesanan?q=${m.note}`} className="ml-1 font-mono text-xs text-plum underline">{m.note}</Link> : <span className="ml-1 text-xs text-muted">({m.note})</span>)}
                    </td>
                    <td className={`text-right tabular-nums font-medium ${m.change > 0 ? "text-success" : "text-danger"}`}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                    <td className="text-right tabular-nums">{m.balance}</td>
                    <td className="text-muted">{m.user?.name ?? "Sistem"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Import / export massal" id="import">
        <CsvImport />
      </Card>
    </div>
  );
}
