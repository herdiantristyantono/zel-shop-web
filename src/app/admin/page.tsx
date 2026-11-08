import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart } from "@/components/admin/BarChart";
import { Badge, Card, dateTime, ORDER_TONE, PageHeader, Skeleton, StatCard, Table } from "@/components/admin/ui";
import { can, requireStaff } from "@/lib/admin";
import { dailyRevenue, lowStock, ordersByStatus, salesByProduct, startOfDayWIB, totals } from "@/lib/admin-stats";
import { rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ringkasan" };
const shortDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

export default function DashboardPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Dashboard {...props} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const [user, sp] = await Promise.all([requireStaff("dashboard"), searchParams]);
  const showRevenue = can(user.role, "revenue");
  const today = startOfDayWIB();
  const tomorrow = startOfDayWIB(new Date(), 1);
  const d7 = startOfDayWIB(new Date(), -6);
  const d30 = startOfDayWIB(new Date(), -29);

  const [tToday, t7, t30, series, status, top, low, recent] = await Promise.all([
    showRevenue ? totals(today, tomorrow) : null,
    showRevenue ? totals(d7, tomorrow) : null,
    showRevenue ? totals(d30, tomorrow) : null,
    showRevenue ? dailyRevenue(d30, tomorrow) : null,
    ordersByStatus(),
    showRevenue ? salesByProduct(d30, tomorrow, 5) : null,
    lowStock(10),
    prisma.order.findMany({ where: { NOT: { orderNumber: { startsWith: "ZEL-SEED-" } } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <>
      <PageHeader title={`Halo, ${user.name.split(" ")[0]}`} description="Ringkasan toko hari ini." />
      {sp.akses === "ditolak" && <p role="alert" className="mb-6 rounded-xl bg-[#FBE9EC] px-4 py-3 text-sm text-danger">Peran Anda tidak memiliki akses ke halaman tersebut.</p>}

      {showRevenue && tToday && t7 && t30 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Penjualan hari ini" value={rupiah(tToday.revenue)} hint={`${tToday.orders} pesanan dibayar`} />
          <StatCard label="7 hari terakhir" value={rupiah(t7.revenue)} hint={`${t7.orders} pesanan`} />
          <StatCard label="30 hari terakhir" value={rupiah(t30.revenue)} hint={`${t30.orders} pesanan · ${t30.items} barang`} />
          <StatCard label="Rata-rata pesanan (30h)" value={rupiah(t30.aov)} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        {series && (
          <Card title="Pendapatan 30 hari terakhir">
            <BarChart
              title="Pendapatan harian 30 hari terakhir"
              valueLabel="Pendapatan"
              data={series.map((d) => ({ label: shortDay.format(new Date(`${d.day}T00:00:00Z`)), value: d.revenue, display: rupiah(d.revenue), sublabel: `${d.orders} pesanan` }))}
            />
          </Card>
        )}
        <Card title="Pesanan per status" actions={<Link href="/admin/pesanan" className="text-sm text-plum underline">Semua</Link>}>
          <ul className="space-y-1">
            {(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"] as const).map((s) => (
              <li key={s}>
                <Link href={`/admin/pesanan?status=${s}`} className="flex min-h-11 items-center justify-between rounded-xl px-2 hover:bg-cream">
                  <Badge tone={ORDER_TONE[s]}>{STATUS_LABEL[s]}</Badge>
                  <span className="font-semibold tabular-nums text-ink">{status[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
          {(status.PAID ?? 0) > 0 && <p className="mt-3 rounded-xl bg-plum-soft p-3 text-sm text-plum"><strong>{status.PAID}</strong> pesanan dibayar menunggu diproses.</p>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {top && (
          <Card title="Produk terlaris (30 hari)">
            {top.length === 0 ? (
              <p className="text-sm text-muted">Belum ada penjualan.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {top.map((p, i) => (
                  <li key={p.name} className="flex justify-between gap-3">
                    <span className="text-ink"><span className="mr-2 text-muted">{i + 1}.</span>{p.name}</span>
                    <span className="tabular-nums text-ink">{p.quantity} pcs · {rupiah(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}
        <Card title="Stok menipis" actions={<Link href="/admin/stok?filter=menipis" className="text-sm text-plum underline">Kelola stok</Link>}>
          {low.length === 0 ? (
            <p className="text-sm text-muted">Semua stok aman.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {low.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="text-ink">{v.productName}</span> <span className="text-muted">· {v.colorName}</span>
                    <span className="block font-mono text-xs text-muted">{v.sku}</span>
                  </span>
                  <Badge tone={v.stock === 0 ? "bad" : "warn"}>{v.stock === 0 ? "Habis" : `Sisa ${v.stock}`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-sans text-base font-semibold text-ink">Pesanan terbaru</h2>
        <Table label="Pesanan terbaru">
          <thead><tr><th>No. pesanan</th><th>Waktu</th><th>Pelanggan</th><th className="text-right">Total</th><th>Status</th></tr></thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/pesanan/${o.id}`} className="font-mono font-medium text-plum underline">{o.orderNumber}</Link></td>
                <td className="text-muted">{dateTime.format(o.createdAt)}</td>
                <td>{o.customerName}</td>
                <td className="text-right tabular-nums">{rupiah(o.total)}</td>
                <td><Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
