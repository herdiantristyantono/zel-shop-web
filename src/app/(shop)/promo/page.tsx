import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import { Countdown } from "@/components/Countdown";
import { ProductGrid } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getHomeData, searchProducts, TAGS } from "@/lib/catalog";
import { rupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Promo & Diskon",
  description: "Flash sale, kode kupon, dan produk diskon Zel Shop.",
  alternates: { canonical: "/promo" },
};

async function getCoupons() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.home);
  const now = new Date();
  return prisma.coupon.findMany({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { createdAt: "asc" } });
}

export default function PromoPage() {
  return (
    <Suspense fallback={<div className="container-page py-14"><div className="h-96 animate-pulse rounded-2xl bg-blush" /></div>}>
      <PromoContent />
    </Suspense>
  );
}

async function PromoContent() {
  const [home, discounted, coupons] = await Promise.all([getHomeData(), searchProducts({ diskon: true, sort: "terlaris" }), getCoupons()]);
  const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-10">
        <p className="eyebrow mb-2">Hemat lebih banyak</p>
        <h1 className="text-4xl sm:text-5xl">Promo</h1>
      </header>

      {coupons.length > 0 && (
        <section className="mb-16">
          <SectionHeading title="Kode Kupon" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((c) => (
              <li key={c.id} className="relative rounded-2xl border border-dashed border-plum/50 bg-white p-6">
                <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-cream" aria-hidden />
                <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-cream" aria-hidden />
                <p className="font-mono text-xl font-semibold tracking-widest text-plum">{c.code}</p>
                <p className="mt-2 text-sm text-ink">{c.description}</p>
                <p className="mt-3 text-xs text-muted">
                  {c.minPurchase > 0 && <>Min. belanja {rupiah(c.minPurchase)} · </>}Berlaku s.d. {dateFmt.format(c.endsAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {home.flashSale && home.flashSale.products.length > 0 && (
        <section className="mb-16 rounded-3xl bg-blush p-5 sm:p-8">
          <SectionHeading eyebrow="Waktu terbatas" title={home.flashSale.name}>
            <Countdown endsAt={home.flashSale.endsAt} />
          </SectionHeading>
          <ProductGrid products={home.flashSale.products} />
        </section>
      )}

      <section>
        <SectionHeading title="Sedang Diskon" href="/produk?diskon=1" />
        <ProductGrid products={discounted.items} />
      </section>
    </div>
  );
}
