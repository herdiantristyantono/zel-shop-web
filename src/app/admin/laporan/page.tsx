import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart, HBarList } from "@/components/admin/BarChart";
import { PrintButton } from "@/components/admin/OrderActions";
import { Card, EmptyState, PageHeader, Skeleton, StatCard, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { dailyRevenue, salesByCategory, salesByProduct, startOfDayWIB, totals, ymdWIB } from "@/lib/admin-stats";
import { rupiah } from "@/lib/format";
import { parseRange } from "@/lib/report-range";

export const metadata: Metadata = { title: "Laporan" };
const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });

export default function ReportsPage(props: PageProps<"/admin/laporan">) {
  return (
    <>
      <PageHeader title="Laporan penjualan" description="Hanya pesanan yang sudah dibayar (dibayar, diproses, dikirim, selesai). Waktu dalam WIB." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Report {...props} />
      </Suspense>
    </>
  );
}

async function Report({ searchParams }: PageProps<"/admin/laporan">) {
  await requireStaff("reports");
  const r = parseRange(await searchParams);
  const [t, daily, byCat, byProd] = await Promise.all([totals(r.start, r.end), dailyRevenue(r.start, r.end), salesByCategory(r.start, r.end), salesByProduct(r.start, r.end, 100)]);

  // > 92 hari → kelompokkan per bulan agar grafik tetap terbaca
  const series =
    r.days > 92
      ? Object.values(
          daily.reduce<Record<string, { key: string; revenue: number; orders: number }>>((acc, d) => {
            const k = d.day.slice(0, 7);
            acc[k] ??= { key: k, revenue: 0, orders: 0 };
            acc[k].revenue += d.revenue;
            acc[k].orders += d.orders;
            return acc;
          }, {}),
        ).map((m) => ({ label: monthFmt.format(new Date(`${m.key}-01T00:00:00Z`)), value: m.revenue, display: rupiah(m.revenue), sublabel: `${m.orders} pesanan` }))
      : daily.map((d) => ({ label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)), value: d.revenue, display: rupiah(d.revenue), sublabel: `${d.orders} pesanan` }));

  const now = new Date();
  const monthStart = `${ymdWIB(now).slice(0, 7)}-01`;
  const prevMonthEnd = ymdWIB(new Date(new Date(`${monthStart}T00:00:00+07:00`).getTime() - 1));
  const presets = [
    ["7 hari", ymdWIB(startOfDayWIB(now, -6)), ymdWIB(now)],
    ["30 hari", ymdWIB(startOfDayWIB(now, -29)), ymdWIB(now)],
    ["Bulan ini", monthStart, ymdWIB(now)],
    ["Bulan lalu", `${prevMonthEnd.slice(0, 7)}-01`, prevMonthEnd],
    ["12 bulan", ymdWIB(startOfDayWIB(now, -364)), ymdWIB(now)],
  ];
  const itemRevenue = byProd.reduce((n, p) => n + p.revenue, 0);
  const csv = (jenis: string) => `/api/admin/report.csv?dari=${r.from}&sampai=${r.to}&jenis=${jenis}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <nav className="flex flex-wrap gap-2" aria-label="Periode cepat">
          {presets.map(([label, f, s]) => (
            <Link key={label} href={`?dari=${f}&sampai=${s}`} aria-current={r.from === f && r.to === s ? "page" : undefined} className={`btn min-h-10 border px-4 ${r.from === f && r.to === s ? "border-plum bg-plum text-white" : "border-line bg-white text-ink"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-muted">Dari<input type="date" name="dari" defaultValue={r.from} className="input mt-1 w-auto" /></label>
          <label className="flex flex-col text-xs text-muted">Sampai<input type="date" name="sampai" defaultValue={r.to} className="input mt-1 w-auto" /></label>
          <button className="btn-outline">Terapkan</button>
        </form>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={csv("harian")} className="btn-outline">Excel: harian</a>
          <a href={csv("produk")} className="btn-outline">Excel: produk</a>
          <a href={csv("kategori")} className="btn-outline">Excel: kategori</a>
          <PrintButton />
        </div>
      </div>
      <p className="hidden text-sm print:block">Periode {r.from} s.d. {r.to}</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan" value={rupiah(t.revenue)} hint={`${r.from} – ${r.to}`} />
        <StatCard label="Pesanan dibayar" value={t.orders} />
        <StatCard label="Barang terjual" value={t.items} />
        <StatCard label="Rata-rata pesanan" value={rupiah(t.aov)} />
      </div>

      <Card title={r.days > 92 ? "Pendapatan per bulan" : "Pendapatan per hari"}>
        <BarChart title={`Pendapatan ${r.from} sampai ${r.to}`} valueLabel="Pendapatan" data={series} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card title="Per kategori">
          {byCat.length === 0 ? <p className="text-sm text-muted">Belum ada penjualan.</p> : <HBarList valueLabel="Pendapatan per kategori" data={byCat.map((c) => ({ label: c.name, value: c.revenue, display: rupiah(c.revenue), sublabel: `${c.quantity} pcs` }))} />}
        </Card>
        <div>
          <h2 className="mb-3 font-sans text-base font-semibold text-ink">Per produk</h2>
          {byProd.length === 0 ? (
            <EmptyState title="Belum ada penjualan di periode ini" />
          ) : (
            <Table label="Penjualan per produk">
              <thead><tr><th>#</th><th>Produk</th><th className="text-right">Terjual</th><th className="text-right">Pendapatan barang</th><th className="text-right">Porsi</th></tr></thead>
              <tbody>
                {byProd.map((p, i) => (
                  <tr key={p.name}>
                    <td className="text-muted">{i + 1}</td>
                    <td>{p.name}</td>
                    <td className="text-right tabular-nums">{p.quantity}</td>
                    <td className="text-right tabular-nums">{rupiah(p.revenue)}</td>
                    <td className="text-right tabular-nums text-muted">{itemRevenue ? `${((p.revenue / itemRevenue) * 100).toFixed(1)}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
