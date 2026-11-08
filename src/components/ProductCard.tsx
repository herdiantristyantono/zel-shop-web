import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { Stars } from "./Stars";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const [img, hover] = product.images;
  return (
    <article className="group relative flex flex-col">
      <Link href={`/produk/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-blush">
          {img && (
            <ProductImage
              src={img.url}
              alt={img.alt}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              priority={priority}
              className="object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
          )}
          {hover && (
            <ProductImage src={hover.url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.isFlashSale && <span className="rounded-full bg-plum px-2.5 py-1 text-[11px] font-semibold text-white">Flash Sale</span>}
            {!product.inStock && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white">Stok habis</span>}
          </div>
        </div>
        <div className="mt-3 space-y-1 px-0.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{product.category.name}</p>
          <h3 className="line-clamp-2 font-sans text-sm font-medium leading-snug text-ink sm:text-[15px]">{product.name}</h3>
          <Price price={product.price} compareAt={product.compareAtPrice} />
          <div className="flex items-center gap-2 pt-0.5">
            {product.ratingCount > 0 && <Stars value={product.ratingAvg} count={product.ratingCount} size={12} />}
            {product.soldCount > 0 && <span className="text-xs text-muted">· {product.soldCount} terjual</span>}
          </div>
        </div>
      </Link>
      {product.colors.length > 1 && (
        <ul className="mt-2 flex gap-1.5 px-0.5" aria-label={`Tersedia ${product.colors.length} warna`}>
          {product.colors.slice(0, 5).map((c) => (
            <li key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15" style={{ background: c.hex }} />
          ))}
        </ul>
      )}
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
