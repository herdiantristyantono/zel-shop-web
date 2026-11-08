import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

/** Status yang dihitung sebagai penjualan (sudah dibayar). */
const SOLD = Prisma.sql`o.status IN ('PAID','PROCESSING','SHIPPED','COMPLETED') AND o."paidAt" IS NOT NULL AND o."orderNumber" NOT LIKE 'ZEL-SEED-%'`;

/** Awal hari (00:00 WIB) untuk tanggal tertentu, sebagai Date UTC. */
export function startOfDayWIB(d = new Date(), addDays = 0) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
  const t = new Date(`${ymd}T00:00:00+07:00`);
  t.setUTCDate(t.getUTCDate() + addDays);
  return t;
}
export const ymdWIB = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);

export type DayPoint = { day: string; revenue: number; orders: number };

export async function dailyRevenue(from: Date, to: Date): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
    SELECT to_char(o."paidAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
           SUM(o.total)::float8 AS revenue, COUNT(*)::int AS orders
    FROM "Order" o WHERE ${SOLD} AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  for (let d = new Date(from); d < to; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymdWIB(d);
    out.push({ day: key, revenue: map.get(key)?.revenue ?? 0, orders: map.get(key)?.orders ?? 0 });
  }
  return out;
}

export async function totals(from: Date, to: Date) {
  const [r] = await prisma.$queryRaw<{ revenue: number; orders: number; items: number }[]>`
    SELECT COALESCE(SUM(o.total),0)::float8 AS revenue, COUNT(*)::int AS orders,
           COALESCE((SELECT SUM(i.quantity) FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${SOLD} AND o."paidAt" >= ${from} AND o."paidAt" < ${to}),0)::int AS items
    FROM "Order" o WHERE ${SOLD} AND o."paidAt" >= ${from} AND o."paidAt" < ${to}`;
  return { ...r, aov: r.orders ? Math.round(r.revenue / r.orders) : 0 };
}

export async function salesByProduct(from: Date, to: Date, limit = 50) {
  return prisma.$queryRaw<{ name: string; sku_count: number; quantity: number; revenue: number }[]>`
    SELECT i."productName" AS name, COUNT(DISTINCT i.sku)::int AS sku_count, SUM(i.quantity)::int AS quantity, SUM(i."unitPrice" * i.quantity)::float8 AS revenue
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    WHERE ${SOLD} AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
    GROUP BY 1 ORDER BY quantity DESC, revenue DESC LIMIT ${limit}`;
}

export async function salesByCategory(from: Date, to: Date) {
  return prisma.$queryRaw<{ name: string; quantity: number; revenue: number }[]>`
    SELECT COALESCE(c.name, 'Lainnya') AS name, SUM(i.quantity)::int AS quantity, SUM(i."unitPrice" * i.quantity)::float8 AS revenue
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    LEFT JOIN "Product" p ON p.id = i."productId" LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${SOLD} AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
    GROUP BY 1 ORDER BY revenue DESC`;
}

export async function lowStock(limit = 20) {
  return prisma.$queryRaw<{ id: string; sku: string; colorName: string; stock: number; minStockAlert: number; productId: string; productName: string }[]>`
    SELECT v.id, v.sku, v."colorName", v.stock, p."minStockAlert", p.id AS "productId", p.name AS "productName"
    FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
    WHERE v."isActive" AND v.stock <= p."minStockAlert"
    ORDER BY v.stock ASC, p.name LIMIT ${limit}`;
}

export async function ordersByStatus() {
  const rows = await prisma.order.groupBy({ by: ["status"], where: { NOT: { orderNumber: { startsWith: "ZEL-SEED-" } } }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}
