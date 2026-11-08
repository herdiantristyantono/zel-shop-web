import Link from "next/link";
import { BannerCarousel } from "@/components/BannerCarousel";
import { Countdown } from "@/components/Countdown";
import { ReturnIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { ProductGrid } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { SectionHeading } from "@/components/SectionHeading";
import { Stars } from "@/components/Stars";
import { getCategories, getHomeData } from "@/lib/catalog";
import { site } from "@/lib/site";

export default async function HomePage() {
  const [home, categories] = await Promise.all([getHomeData(), getCategories()]);

  return (
    <>
      <BannerCarousel banners={home.banners} />

      <section className="border-b border-line bg-white" aria-label="Keunggulan">
        <ul className="container-page grid grid-cols-1 gap-4 py-5 text-sm sm:grid-cols-3">
          {[
            [TruckIcon, "Kirim ke seluruh Indonesia", "JNE, J&T, SiCepat, AnterAja, POS"],
            [ShieldIcon, "Pembayaran aman", "QRIS, VA, e-wallet & kartu kredit"],
            [ReturnIcon, "Garansi tukar", "Jika barang rusak atau salah kirim"],
          ].map(([Icon, title, sub]) => {
            const I = Icon as typeof TruckIcon;
            return (
              <li key={title as string} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-plum"><I /></span>
                <span>
                  <span className="block font-medium text-ink">{title as string}</span>
                  <span className="text-muted">{sub as string}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-page py-14 sm:py-20">
        <SectionHeading eyebrow="Kategori" title="Temukan yang Anda Cari" />
        <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
          {categories.map((c) => (
            <li key={c.slug} className="w-32 shrink-0 snap-start sm:w-auto">
              <Link href={`/kategori/${c.slug}`} className="group block text-center">
                <div className="relative aspect-square overflow-hidden rounded-full bg-blush">
                  {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                </div>
                <span className="mt-3 block text-sm font-medium leading-snug text-ink">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {home.flashSale && home.flashSale.products.length > 0 && (
        <section className="bg-blush py-14 sm:py-16">
          <div className="container-page">
            <SectionHeading eyebrow="Waktu terbatas" title={home.flashSale.name} href="/promo">
              <Countdown endsAt={home.flashSale.endsAt} />
            </SectionHeading>
            <ProductGrid products={home.flashSale.products} />
          </div>
        </section>
      )}

      <section className="container-page py-14 sm:py-20">
        <SectionHeading eyebrow="Baru datang" title="Produk Terbaru" href="/produk?sort=terbaru" />
        <ProductGrid products={home.newest} />
      </section>

      <section className="container-page pb-14 sm:pb-20">
        <SectionHeading eyebrow="Favorit pelanggan" title="Terlaris" href="/produk?sort=terlaris" />
        <ProductGrid products={home.bestSellers.slice(0, 4)} />
      </section>

      {home.testimonials.length > 0 && (
        <section className="bg-white py-14 sm:py-20">
          <div className="container-page">
            <SectionHeading eyebrow="Testimoni" title="Kata Mereka" />
            <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
              {home.testimonials.map((t) => (
                <li key={t.id} className="w-[80vw] max-w-sm shrink-0 snap-start rounded-[var(--radius-card)] border border-line bg-cream p-6 sm:w-auto">
                  <Stars value={t.rating} />
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-ink">“{t.body}”</blockquote>
                  <p className="mt-4 text-sm font-medium text-plum">
                    {t.name}
                    {t.city && <span className="font-normal text-muted"> · {t.city}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="container-page pt-14 text-center sm:pt-20">
        <p className="eyebrow mb-3">Ikuti kami</p>
        <h2 className="text-3xl sm:text-4xl">Inspirasi gaya setiap hari</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">Koleksi baru, tips padu padan, dan promo eksklusif lebih dulu di Instagram & TikTok kami.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="btn-primary">Instagram</a>
          <a href={site.social.tiktok} target="_blank" rel="noopener noreferrer" className="btn-outline">TikTok</a>
        </div>
      </section>
    </>
  );
}
