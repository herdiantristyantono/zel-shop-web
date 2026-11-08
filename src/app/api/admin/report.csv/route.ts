import type { NextRequest } from "next/server";
import { assertStaff } from "@/lib/admin";
import { dailyRevenue, salesByCategory, salesByProduct } from "@/lib/admin-stats";
import { toCsv } from "@/lib/csv";
import { parseRange } from "@/lib/report-range";

/** Export laporan penjualan (CSV, dibuka langsung di Excel). ?jenis=harian|produk|kategori */
export async function GET(req: NextRequest) {
  try {
    await assertStaff("reports");
  } catch {
    return new Response("Tidak diizinkan", { status: 403 });
  }
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const r = parseRange(sp);
  const kind = sp.jenis === "produk" || sp.jenis === "kategori" ? sp.jenis : "harian";
  let rows: (string | number)[][];
  if (kind === "produk") {
    const data = await salesByProduct(r.start, r.end, 1000);
    rows = [["produk", "jumlah_terjual", "pendapatan"], ...data.map((d) => [d.name, d.quantity, d.revenue])];
  } else if (kind === "kategori") {
    const data = await salesByCategory(r.start, r.end);
    rows = [["kategori", "jumlah_terjual", "pendapatan"], ...data.map((d) => [d.name, d.quantity, d.revenue])];
  } else {
    const data = await dailyRevenue(r.start, r.end);
    rows = [["tanggal", "pesanan", "pendapatan"], ...data.map((d) => [d.day, d.orders, d.revenue])];
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${kind}-${r.from}_${r.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
