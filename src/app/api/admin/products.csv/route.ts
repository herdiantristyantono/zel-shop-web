import { assertStaff } from "@/lib/admin";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

/** Export produk per varian (bisa diedit di Excel lalu di-import ulang lewat halaman Stok). */
export async function GET() {
  try {
    await assertStaff("stock");
  } catch {
    return new Response("Tidak diizinkan", { status: 403 });
  }
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    include: { product: { include: { category: { select: { slug: true } } } } },
  });
  const rows = [
    ["sku", "product_slug", "product_name", "category", "color", "color_hex", "price", "compare_at_price", "variant_price", "stock", "weight_gram", "published", "variant_active"],
    ...variants.map((v) => [
      v.sku,
      v.product.slug,
      v.product.name,
      v.product.category.slug,
      v.colorName,
      v.colorHex,
      v.product.price,
      v.product.compareAtPrice ?? "",
      v.priceOverride ?? "",
      v.stock,
      v.product.weightGram,
      v.product.isPublished ? 1 : 0,
      v.isActive ? 1 : 0,
    ]),
  ];
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zelshop-produk-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
