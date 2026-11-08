"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "./ProductImage";

type Banner = { id: string; title: string; subtitle: string | null; imageUrl: string; linkUrl: string | null; ctaLabel: string | null };

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || el.matches(":hover")) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % banners.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  return (
    <section aria-roledescription="carousel" aria-label="Promo" className="relative">
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {banners.map((b, i) => (
          <div key={b.id} className="relative w-full shrink-0 snap-start" aria-roledescription="slide" aria-label={`${i + 1} dari ${banners.length}`}>
            <div className="relative aspect-[4/5] sm:aspect-[16/7]">
              <ProductImage src={b.imageUrl} alt="" fill preload={i === 0} fetchPriority={i === 0 ? "high" : "auto"} sizes="100vw" className="object-cover object-right" />
              <div className="absolute inset-0 bg-gradient-to-t from-blush from-35% via-blush/85 to-blush/10 sm:bg-none" />
              <div className="container-page absolute inset-0 flex items-end pb-12 sm:items-center sm:pb-0">
                <div className="max-w-md">
                  <p className="eyebrow mb-3">Zel Shop</p>
                  <h2 className="text-4xl leading-tight sm:text-6xl">{b.title}</h2>
                  {b.subtitle && <p className="mt-3 text-base text-ink sm:text-lg">{b.subtitle}</p>}
                  {b.linkUrl && (
                    <Link href={b.linkUrl} className="btn-primary mt-6">
                      {b.ctaLabel ?? "Belanja Sekarang"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" })}
              className="flex h-11 w-11 items-center justify-center"
              aria-label={`Tampilkan promo ${i + 1}`}
              aria-current={i === index}
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-plum" : "w-1.5 bg-plum/30"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
