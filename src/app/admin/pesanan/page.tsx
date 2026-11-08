import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, dateTime, EmptyState, ORDER_TONE, PageHeader, Pagination, Skeleton, Table } from "@/components/admin/ui";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/admin";
import { rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { COURIER_NAMES } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pesanan" };
const PER = 20;
const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export default function OrdersAdminPage(props: PageProps<"/admin/pesanan">) {
  return (
    <>
      <PageHeader title="Pesanan" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <OrderList {...props} />
      </Suspense>
    </>
  );
}

async function OrderList({ searchParams }: PageProps<"/admin/pesanan">) {
  await requireStaff("orders");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const from = typeof sp.dari === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dari) ? sp.dari : "";
  const to = typeof sp.sampai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.sampai) ? sp.sampai : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {
    NOT: { orderNumber: { startsWith: "ZEL-SEED-" } },
    ...(status && { status }),
    ...(q && {
      OR: [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { trackingNumber: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...((from || to) && {
      createdAt: { ...(from && { gte: new Date(`${from}T00:00:00+07:00`) }), ...(to && { lt: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000) }) },
    }),
  };
  const [rows, total, counts] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where: { NOT: { orderNumber: { startsWith: "ZEL-SEED-" } } }, _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(from && { dari: from }), ...(to && { sampai: to }), ...extra });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p}`;
  };

  return (
    <>
      <nav className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter status">
        <Link href={qs({ status: "", page: "" })} aria-current={!status ? "page" : undefined} className={`btn min-h-10 shrink-0 border px-4 ${!status ? "border-plum bg-plum text-white" : "border-line bg-white text-ink"}`}>Semua</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={qs({ status: s, page: "" })} aria-current={status === s ? "page" : undefined} className={`btn min-h-10 shrink-0 border px-4 ${status === s ? "border-plum bg-plum text-white" : "border-line bg-white text-ink"}`}>
            {STATUS_LABEL[s]} <span className="tabular-nums opacity-80">{count(s)}</span>
          </Link>
        ))}
      </nav>
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex flex-col text-xs text-muted">Cari<input name="q" defaultValue={q} placeholder="No. pesanan, nama, email, HP, resi" className="input mt-1 w-72 max-w-full" /></label>
        <label className="flex flex-col text-xs text-muted">Dari<input type="date" name="dari" defaultValue={from} className="input mt-1 w-auto" /></label>
        <label className="flex flex-col text-xs text-muted">Sampai<input type="date" name="sampai" defaultValue={to} className="input mt-1 w-auto" /></label>
        <button className="btn-outline">Terapkan</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada pesanan" />
      ) : (
        <Table label="Daftar pesanan">
          <thead><tr><th>No. pesanan</th><th>Dibuat</th><th>Pelanggan</th><th>Kurir</th><th className="text-right">Total</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/pesanan/${o.id}`} className="font-mono font-medium text-plum underline">{o.orderNumber}</Link>
                  <span className="block text-xs text-muted">{o._count.items} item</span>
                </td>
                <td className="text-muted">{dateTime.format(o.createdAt)}</td>
                <td>{o.customerName}<span className="block text-xs text-muted">{o.city}</span></td>
                <td className="text-muted">{COURIER_NAMES[o.courierCode] ?? o.courierCode} {o.courierService}{o.trackingNumber && <span className="block font-mono text-xs">{o.trackingNumber}</span>}</td>
                <td className="text-right tabular-nums">{rupiah(o.total)}</td>
                <td><Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER)} href={(p) => qs({ page: String(p) })} />
    </>
  );
}
