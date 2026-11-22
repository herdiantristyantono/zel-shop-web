import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { isWhatsAppPageSlug, whatsappPageDefaults, whatsappPageSlug } from "./pages-whatsapp";
import { prisma } from "./prisma";

/** Tag cache — admin memanggil revalidateTag(...) setelah mengubah data. */
export const TAGS = { products: "products", categories: "categories", home: "home", pages: "pages" } as const;

export const PAGE_SIZE = 12;

const activeFlashWhere = () => {
  const now = new Date();
  return { flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } } };
};

const cardInclude = () =>
  ({
    images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, alt: true } },
    variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { colorName: true, colorHex: true, stock: true } },
    category: { select: { name: true, slug: true } },
    flashSaleItems: { where: activeFlashWhere(), select: { salePrice: true, quota: true, soldCount: true, flashSale: { select: { endsAt: true } } } },
  }) satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: ReturnType<typeof cardInclude> }>;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  isFlashSale: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  images: { url: string; alt: string }[];
  colors: { name: string; hex: string }[];
  inStock: boolean;
  category: { name: string; slug: string };
};

/** Harga efektif: harga flash sale (jika aktif) → harga jual. Harga coret = harga normal tertinggi. */
function toCard(p: CardRow): ProductCardData {
  // Flash sale berlaku selama kuota belum habis
  const flash = p.flashSaleItems.find((f) => f.quota == null || f.soldCount < f.quota);
  const price = flash ? flash.salePrice : p.price;
  const compareAt = flash ? (p.compareAtPrice ?? p.price) : p.compareAtPrice;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    compareAtPrice: compareAt && compareAt > price ? compareAt : null,
    isFlashSale: Boolean(flash),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    images: p.images,
    colors: p.variants.map((v) => ({ name: v.colorName, hex: v.colorHex })),
    inStock: p.variants.some((v) => v.stock > 0),
    category: p.category,
  };
}

// ───────────── Kategori ─────────────

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.categories);
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true, _count: { select: { products: { where: { isPublished: true } } } } },
  });
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.categories);
  return prisma.category.findUnique({ where: { slug } });
}

// ───────────── Daftar produk + filter ─────────────

export type ProductFilters = {
  q?: string;
  kategori?: string[];
  min?: number;
  max?: number;
  warna?: string[];
  ukuran?: string[];
  bahan?: string[];
  rating?: number;
  diskon?: boolean;
  sort?: SortKey;
  page?: number;
};

export const SORTS = {
  terbaru: { label: "Terbaru", orderBy: { createdAt: "desc" } },
  terlaris: { label: "Terlaris", orderBy: { soldCount: "desc" } },
  termurah: { label: "Harga terendah", orderBy: { price: "asc" } },
  termahal: { label: "Harga tertinggi", orderBy: { price: "desc" } },
  rating: { label: "Rating tertinggi", orderBy: { ratingAvg: "desc" } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;
export type SortKey = keyof typeof SORTS;

export const MATERIALS: Record<string, { label: string; match: string }> = {
  "kulit-sintetis": { label: "Kulit sintetis", match: "sintetis" },
  "kulit-asli": { label: "Kulit asli", match: "kulit sapi" },
  kanvas: { label: "Kanvas", match: "kanvas" },
  satin: { label: "Satin", match: "satin" },
  nilon: { label: "Nilon", match: "nilon" },
};

const SIZES = ["MINI", "SMALL", "MEDIUM", "LARGE"] as const;

function buildWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isPublished: true }];
  if (f.q) {
    const q = f.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { material: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { variants: { some: { colorName: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (f.kategori?.length) and.push({ category: { slug: { in: f.kategori } } });
  if (f.min != null) and.push({ price: { gte: f.min } });
  if (f.max != null) and.push({ price: { lte: f.max } });
  if (f.warna?.length) and.push({ variants: { some: { isActive: true, colorName: { in: f.warna } } } });
  const sizes = f.ukuran?.filter((s): s is (typeof SIZES)[number] => (SIZES as readonly string[]).includes(s));
  if (sizes?.length) and.push({ size: { in: sizes } });
  const mats = f.bahan?.map((b) => MATERIALS[b]?.match).filter(Boolean) as string[] | undefined;
  if (mats?.length) and.push({ OR: mats.map((m) => ({ material: { contains: m, mode: "insensitive" as const } })) });
  if (f.rating) and.push({ ratingAvg: { gte: f.rating } });
  if (f.diskon) and.push({ OR: [{ compareAtPrice: { not: null } }, { flashSaleItems: { some: activeFlashWhere() } }] });
  return { AND: and };
}

export async function searchProducts(filters: ProductFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.products);
  const where = buildWhere(filters);
  const page = Math.max(1, filters.page ?? 1);
  const sort = SORTS[filters.sort ?? "terbaru"] ?? SORTS.terbaru;
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [sort.orderBy, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: cardInclude(),
    }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(toCard), total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Opsi filter yang tersedia (warna & rentang harga) */
export async function getFilterOptions() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.products);
  const [colors, priceRange] = await Promise.all([
    prisma.productVariant.groupBy({
      by: ["colorName", "colorHex"],
      where: { isActive: true, product: { isPublished: true } },
      orderBy: { colorName: "asc" },
    }),
    prisma.product.aggregate({ where: { isPublished: true }, _min: { price: true }, _max: { price: true } }),
  ]);
  const seen = new Set<string>();
  return {
    colors: colors.filter((c) => !seen.has(c.colorName) && seen.add(c.colorName)).map((c) => ({ name: c.colorName, hex: c.colorHex })),
    minPrice: priceRange._min.price ?? 0,
    maxPrice: priceRange._max.price ?? 0,
  };
}

// ───────────── Beranda ─────────────

export async function getHomeData() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.home, TAGS.products);
  const now = new Date();
  const [banners, newest, bestSellers, flashSale, testimonials] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 8, include: cardInclude() }),
    prisma.product.findMany({ where: { isPublished: true }, orderBy: { soldCount: "desc" }, take: 8, include: cardInclude() }),
    prisma.flashSale.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { endsAt: "asc" },
      include: { items: { include: { product: { include: cardInclude() } } } },
    }),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
  ]);
  return {
    banners,
    newest: newest.map(toCard),
    bestSellers: bestSellers.map(toCard),
    flashSale: flashSale
      ? { name: flashSale.name, endsAt: flashSale.endsAt.toISOString(), products: flashSale.items.filter((i) => i.product.isPublished).map((i) => toCard(i.product)) }
      : null,
    testimonials,
  };
}

// ───────────── Detail produk ─────────────

export async function getProductSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.products);
  return prisma.product.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } });
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.products, `product:${slug}`);
  const p = await prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      ...cardInclude(),
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true, variantId: true, width: true, height: true } },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, colorName: true, colorHex: true, stock: true, sku: true, priceOverride: true },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, body: true, createdAt: true, adminReply: true, user: { select: { name: true } }, images: { select: { url: true } } },
      },
    },
  });
  if (!p) return null;
  const card = toCard({ ...p, images: p.images.slice(0, 2), variants: p.variants });
  return {
    ...card,
    description: p.description,
    material: p.material,
    size: p.size,
    dims: { p: p.lengthCm, l: p.widthCm, t: p.heightCm },
    weightGram: p.weightGram,
    cardSlots: p.cardSlots,
    compartments: p.compartments,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    flashEndsAt: card.isFlashSale ? (p.flashSaleItems.find((f) => f.quota == null || f.soldCount < f.quota)?.flashSale.endsAt.toISOString() ?? null) : null,
    gallery: p.images,
    variants: p.variants,
    reviews: p.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      adminReply: r.adminReply,
      author: maskName(r.user.name),
      images: r.images.map((i) => i.url),
    })),
    categoryId: p.categoryId,
  };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export async function getRelatedProducts(productId: string, categoryId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.products);
  const sameCat = await prisma.product.findMany({
    where: { isPublished: true, categoryId, id: { not: productId } },
    orderBy: { soldCount: "desc" },
    take: 4,
    include: cardInclude(),
  });
  if (sameCat.length >= 4) return sameCat.map(toCard);
  const more = await prisma.product.findMany({
    where: { isPublished: true, id: { notIn: [productId, ...sameCat.map((p) => p.id)] } },
    orderBy: { soldCount: "desc" },
    take: 4 - sameCat.length,
    include: cardInclude(),
  });
  return [...sameCat, ...more].map(toCard);
}

/** Autocomplete — tidak di-cache per kata kunci yang sangat bervariasi, cukup cepat dengan index. */
export async function suggest(q: string) {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [] };
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true, OR: [{ name: { contains: term, mode: "insensitive" } }, { category: { name: { contains: term, mode: "insensitive" } } }] },
      orderBy: { soldCount: "desc" },
      take: 6,
      select: {
        name: true,
        slug: true,
        price: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        flashSaleItems: { where: activeFlashWhere(), take: 1, select: { salePrice: true } },
      },
    }),
    prisma.category.findMany({ where: { isActive: true, name: { contains: term, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
  ]);
  return { products: products.map((p) => ({ name: p.name, slug: p.slug, price: p.flashSaleItems[0]?.salePrice ?? p.price, image: p.images[0]?.url ?? null })), categories };
}

// ───────────── Halaman info ─────────────

/** whatsappMode: tampilkan versi halaman untuk CHECKOUT_MODE=whatsapp bila ada (lihat lib/pages-whatsapp). */
export async function getPage(slug: string, whatsappMode = false) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.pages);
  if (isWhatsAppPageSlug(slug)) return null; // versi WhatsApp hanya diakses lewat slug biasa
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!whatsappMode) return page;
  const edited = await prisma.page.findUnique({ where: { slug: whatsappPageSlug(slug) } });
  if (edited) return { ...edited, slug };
  const fallback = whatsappPageDefaults[slug];
  if (fallback) return { slug, ...fallback, updatedAt: page?.updatedAt ?? new Date(0) };
  return page;
}

export async function getPageSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.pages);
  const pages = await prisma.page.findMany({ select: { slug: true, updatedAt: true } });
  return pages.filter((p) => !isWhatsAppPageSlug(p.slug));
}

function maskName(name: string) {
  return name
    .split(" ")
    .map((w, i) => (i === 0 ? w : `${w[0]}.`))
    .join(" ");
}
