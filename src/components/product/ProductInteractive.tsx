"use client";

import { useMemo, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/catalog";
import { site, whatsappLink } from "@/lib/site";
import { Countdown } from "../Countdown";
import { ChevronLeft, ChevronRight, CloseIcon, HeartIcon, WhatsAppIcon } from "../icons";
import { Price } from "../Price";
import { ProductImage } from "../ProductImage";
import { Stars } from "../Stars";

type Props = { product: ProductDetail };

export function ProductInteractive({ product }: Props) {
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId);

  // Foto warna terpilih tampil lebih dulu
  const images = useMemo(() => {
    const own = product.gallery.filter((g) => g.variantId === variantId);
    const shared = product.gallery.filter((g) => !g.variantId);
    return own.length ? [...own, ...shared] : product.gallery;
  }, [product.gallery, variantId]);

  const stock = variant?.stock ?? 0;
  const price = variant?.priceOverride && !product.isFlashSale ? variant.priceOverride : product.price;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <Gallery key={variantId} images={images} name={product.name} />

      <div className="lg:pt-2">
        <p className="eyebrow">{product.category.name}</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {product.ratingCount > 0 && (
            <a href="#ulasan" className="inline-flex min-h-11 items-center gap-2 hover:underline">
              <Stars value={product.ratingAvg} />
              <span className="text-muted">
                {product.ratingAvg.toFixed(1)} · {product.ratingCount} ulasan
              </span>
            </a>
          )}
          {product.soldCount > 0 && <span className="text-muted">{product.soldCount} terjual</span>}
        </div>

        {product.isFlashSale && product.flashEndsAt && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-plum px-4 py-3 text-white">
            <span className="font-serif text-xl">Flash Sale</span>
            <span className="[&_.bg-plum]:bg-white [&_.bg-plum]:text-plum [&_span]:text-white">
              <Countdown endsAt={product.flashEndsAt} compact />
            </span>
          </div>
        )}

        <div className="mt-5">
          <Price price={price} compareAt={product.compareAtPrice} size="lg" />
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm text-ink">
            Warna: <span className="font-semibold">{variant?.colorName}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {product.variants.map((v) => {
              const selected = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => (setVariantId(v.id), setQty(1))}
                  aria-pressed={selected}
                  aria-label={`${v.colorName}${v.stock === 0 ? " (stok habis)" : ""}`}
                  title={v.colorName}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 ${selected ? "border-plum" : "border-transparent hover:border-line"}`}
                >
                  <span className="h-9 w-9 rounded-full ring-1 ring-ink/15" style={{ background: v.colorHex }} />
                  {v.stock === 0 && <span className="absolute h-0.5 w-10 rotate-45 bg-ink/60" aria-hidden />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className={`mt-4 text-sm font-medium ${stock === 0 ? "text-danger" : stock <= 3 ? "text-plum" : "text-success"}`} aria-live="polite">
          {stock === 0 ? "Stok habis untuk warna ini" : stock <= 3 ? `Tersisa ${stock} — segera pesan!` : "Stok tersedia"}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label="Jumlah">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || stock === 0} className="h-12 w-12 text-xl text-ink disabled:opacity-40" aria-label="Kurangi jumlah">−</button>
            <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(stock, q + 1))} disabled={qty >= stock} className="h-12 w-12 text-xl text-ink disabled:opacity-40" aria-label="Tambah jumlah">+</button>
          </div>
          <button type="button" disabled={stock === 0} className="btn-primary h-12 flex-1 whitespace-nowrap px-4" data-variant-id={variantId} data-qty={qty}>
            {stock === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
          </button>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white text-plum hover:bg-blush" aria-label="Simpan ke wishlist">
            <HeartIcon />
          </button>
        </div>

        <a
          href={whatsappLink(`Halo ${site.name}, saya mau tanya produk ${product.name}${variant ? ` (warna ${variant.colorName})` : ""}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-3 h-12 w-full"
        >
          <WhatsAppIcon size={20} /> Tanya via WhatsApp
        </a>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
          {[
            ["Bahan", product.material],
            ["Ukuran (P×L×T)", `${fmt(product.dims.p)} × ${fmt(product.dims.l)} × ${fmt(product.dims.t)} cm`],
            ["Berat", `${product.weightGram} gram`],
            product.cardSlots ? ["Slot kartu", `${product.cardSlots} slot`] : null,
            ["Ruang", product.compartments],
            ["SKU", variant?.sku ?? "-"],
          ]
            .filter((x): x is string[] => Boolean(x))
            .map(([k, v]) => (
              <div key={k} className={`bg-white p-4 ${k === "Ruang" || k === "Bahan" ? "col-span-2" : ""}`}>
                <dt className="text-xs uppercase tracking-[0.15em] text-muted">{k}</dt>
                <dd className="mt-1 text-ink">{v}</dd>
              </div>
            ))}
        </dl>
      </div>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("id-ID");

function Gallery({ images, name }: { images: ProductDetail["gallery"]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [bigZoom, setBigZoom] = useState(false);

  const goto = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="lg:sticky lg:top-40 lg:self-start">
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto sm:rounded-[var(--radius-card)]"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden bg-blush lg:cursor-zoom-in"
              onClick={() => dialog.current?.showModal()}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onMouseLeave={() => setZoom(null)}
              aria-label={`Perbesar foto ${i + 1}: ${img.alt}`}
            >
              <ProductImage
                src={img.url}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(min-width:1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-200"
                style={zoom && i === index ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-xs text-ink sm:hidden">
          {index + 1} / {images.length}
        </div>
        {index > 0 && (
          <button type="button" onClick={() => goto(index - 1)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow sm:flex" aria-label="Foto sebelumnya">
            <ChevronLeft />
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" onClick={() => goto(index + 1)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow sm:flex" aria-label="Foto berikutnya">
            <ChevronRight />
          </button>
        )}
      </div>
      <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {images.map((img, i) => (
          <li key={img.id} className="shrink-0">
            <button
              type="button"
              onClick={() => goto(i)}
              aria-label={`Tampilkan foto ${i + 1}`}
              aria-current={i === index}
              className={`relative block h-16 w-16 overflow-hidden rounded-xl border-2 bg-blush sm:h-20 sm:w-20 ${i === index ? "border-plum" : "border-transparent"}`}
            >
              <ProductImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} className="m-0 h-dvh max-h-none w-screen max-w-none bg-cream p-0 backdrop:bg-ink/60" aria-label={`Foto ${name}`} onClose={() => setBigZoom(false)}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-muted">{index + 1} / {images.length} · ketuk foto untuk zoom</span>
            <button type="button" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup">
              <CloseIcon />
            </button>
          </div>
          <div className="relative flex-1 overflow-auto" style={{ touchAction: "pinch-zoom pan-x pan-y" }}>
            <button type="button" onClick={() => setBigZoom((z) => !z)} className={`relative block ${bigZoom ? "h-[200%] w-[200%] cursor-zoom-out" : "h-full w-full cursor-zoom-in"}`} aria-label={bigZoom ? "Perkecil" : "Perbesar"}>
              {images[index] && <ProductImage src={images[index].url} alt={images[index].alt} fill sizes="200vw" className="object-contain" />}
            </button>
          </div>
          <div className="flex justify-center gap-2 p-3">
            <button type="button" disabled={index === 0} onClick={() => (setIndex(index - 1), goto(index - 1), setBigZoom(false))} className="btn-outline px-4" aria-label="Foto sebelumnya"><ChevronLeft /></button>
            <button type="button" disabled={index === images.length - 1} onClick={() => (setIndex(index + 1), goto(index + 1), setBigZoom(false))} className="btn-outline px-4" aria-label="Foto berikutnya"><ChevronRight /></button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
