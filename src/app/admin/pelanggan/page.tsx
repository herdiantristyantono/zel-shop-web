import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { dateOnly, EmptyState, PageHeader, Pagination, Skeleton, Table } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/admin";
import { rupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pelanggan" };
const PER = 25;
const PAID = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

export default function CustomersPage(props: PageProps<"/admin/pelanggan">) {
  return (
    <>
      <PageHeader title="Pelanggan" description="Pelanggan terdaftar. Pembeli tamu terlihat di daftar Pesanan." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Customers {...props} />
      </Suspense>
    </>
  );
}

async function Customers({ searchParams }: PageProps<"/admin/pelanggan">) {
  await requireStaff("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { wishlist: true } } } }),
    prisma.user.count({ where }),
  ]);
  const stats = users.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, status: { in: [...PAID] }, NOT: { orderNumber: { startsWith: "ZEL-SEED-" } } },
        _count: { _all: true },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    : [];
  const stat = (id: string) => stats.find((s) => s.userId === id);

  return (
    <>
      <form className="mb-4 flex gap-2" role="search">
        <label className="sr-only" htmlFor="cq">Cari pelanggan</label>
        <input id="cq" name="q" defaultValue={q} placeholder="Nama, email, atau HP" className="input max-w-xs" />
        <button className="btn-outline">Cari</button>
      </form>
      {users.length === 0 ? (
        <EmptyState title="Belum ada pelanggan" />
      ) : (
        <Table label="Pelanggan">
          <thead><tr><th>Nama</th><th>Kontak</th><th>Bergabung</th><th className="text-right">Pesanan dibayar</th><th className="text-right">Total belanja</th><th>Terakhir belanja</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const s = stat(u.id);
              return (
                <tr key={u.id}>
                  <td className="font-medium text-ink">{u.name}{u._count.wishlist > 0 && <span className="block text-xs font-normal text-muted">{u._count.wishlist} di wishlist</span>}</td>
                  <td><span className="block">{u.email}</span><span className="text-xs text-muted">{u.phone ?? "-"}</span></td>
                  <td className="text-muted">{dateOnly.format(u.createdAt)}</td>
                  <td className="text-right tabular-nums">{s ? <Link href={`/admin/pesanan?q=${encodeURIComponent(u.email)}`} className="text-plum underline">{s._count._all}</Link> : 0}</td>
                  <td className="text-right tabular-nums">{rupiah(s?._sum.total ?? 0)}</td>
                  <td className="text-muted">{s?._max.createdAt ? dateOnly.format(s._max.createdAt) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER)} href={(p) => `?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`} />
    </>
  );
}
