import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "../ProductCard";
import { getCategories, getFilterOptions, MATERIALS, searchProducts, SORTS } from "@/lib/catalog";
import { FilterPanel } from "./FilterPanel";
import { parseFilters, type RawParams } from "./params";
import { SortSelect } from "./SortSelect";

/** Halaman daftar produk (dipakai /produk dan /kategori/[slug]). Harus dibungkus <Suspense>. */
export async function CatalogView({ searchParams, category }: { searchParams: Promise<RawParams>; category?: string }) {
  const sp = await searchParams;
  const filters = parseFilters(sp, category);
  const [result, options, categories] = await Promise.all([searchProducts(filters), getFilterOptions(), getCategories()]);
  const activeCount =
    (category ? 0 : filters.kategori?.length ?? 0) +
    (filters.warna?.length ?? 0) +
    (filters.ukuran?.length ?? 0) +
    (filters.bahan?.length ?? 0) +
    (filters.min || filters.max ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.diskon ? 1 : 0);

  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") p.set(k, v);
    if (page > 1) p.set("page", String(page));
    return `?${p}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <Suspense>
        <FilterPanel
          categories={category ? null : categories.map((c) => ({ value: c.slug, label: c.name }))}
          colors={options.colors.map((c) => ({ value: c.name, label: c.name, hex: c.hex }))}
          materials={Object.entries(MATERIALS).map(([value, m]) => ({ value, label: m.label }))}
          activeCount={activeCount}
        />
      </Suspense>
      <div className="min-w-0">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {result.total} produk{filters.q && <> untuk “<span className="text-ink">{filters.q}</span>”</>}
          </p>
          <Suspense>
            <SortSelect options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
          </Suspense>
        </div>
        {result.items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-blush px-6 py-16 text-center">
            <h2 className="text-2xl">Produk tidak ditemukan</h2>
            <p className="mt-2 text-muted">Coba kata kunci lain atau kurangi filter.</p>
            <Link href="/produk" className="btn-primary mt-6">Lihat semua produk</Link>
          </div>
        ) : (
          <ProductGrid products={result.items} priorityCount={4} />
        )}
        {result.pageCount > 1 && (
          <nav className="mt-12 flex justify-center gap-2" aria-label="Halaman">
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={pageHref(n)}
                aria-current={n === result.page ? "page" : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm ${n === result.page ? "bg-plum text-white" : "text-ink hover:bg-blush"}`}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]" aria-busy>
      <div className="hidden h-96 animate-pulse rounded-2xl bg-blush lg:block" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded-[var(--radius-card)] bg-blush" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-blush" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-blush" />
          </div>
        ))}
      </div>
    </div>
  );
}
