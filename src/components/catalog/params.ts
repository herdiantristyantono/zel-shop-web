import { SORTS, type ProductFilters, type SortKey } from "@/lib/catalog";

export type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

/** Validasi & normalisasi query string → filter (input tidak tepercaya). */
export function parseFilters(sp: RawParams, fixedCategory?: string): ProductFilters {
  const sort = one(sp.sort);
  const q = one(sp.q)?.slice(0, 80).trim();
  return {
    q: q || undefined,
    kategori: fixedCategory ? [fixedCategory] : list(sp.kategori),
    min: num(sp.min),
    max: num(sp.max),
    warna: list(sp.warna),
    ukuran: list(sp.ukuran),
    bahan: list(sp.bahan),
    rating: Math.min(5, num(sp.rating) ?? 0) || undefined,
    diskon: one(sp.diskon) === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : undefined,
    page: num(sp.page),
  };
}
