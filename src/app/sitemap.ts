import type { MetadataRoute } from "next";
import { getCategories, getPageSlugs, getProductSlugs } from "@/lib/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([getProductSlugs(), getCategories(), getPageSlugs()]);
  const u = (path: string) => `${site.url}${path}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/produk"), changeFrequency: "daily", priority: 0.9 },
    { url: u("/promo"), changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: u(`/kategori/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: u(`/produk/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((p) => ({ url: u(`/info/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
