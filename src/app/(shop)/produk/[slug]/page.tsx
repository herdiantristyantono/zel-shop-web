import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductCard";
import { ProductInteractive } from "@/components/product/ProductInteractive";
import { Reviews } from "@/components/product/Reviews";
import { SectionHeading } from "@/components/SectionHeading";
import { WhatsAppProduct } from "@/components/WhatsAppButton";
import { getProduct, getProductSlugs, getRelatedProducts, type ProductDetail } from "@/lib/catalog";
import { getStorefront } from "@/lib/settings";
import { site } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.length ? slugs.map((s) => ({ slug: s.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Produk tidak ditemukan" };
  const description = p.metaDescription ?? p.description.slice(0, 155);
  const image = p.gallery[0]?.url;
  return {
    title: p.metaTitle ?? p.name,
    description,
    alternates: { canonical: `/produk/${p.slug}` },
    openGraph: { type: "website", title: p.name, description, images: image ? [{ url: image, width: 800, height: 800, alt: p.name }] : undefined },
  };
}

export default function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><div className="aspect-square max-w-xl animate-pulse rounded-[var(--radius-card)] bg-blush" /></div>}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const [related, store] = await Promise.all([getRelatedProducts(product.id, product.categoryId), getStorefront()]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(product) }} />
      <WhatsAppProduct name={product.name} />
      <div className="container-page py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <Link href="/" className="hover:text-plum">Beranda</Link> / <Link href={`/kategori/${product.category.slug}`} className="hover:text-plum">{product.category.name}</Link> /{" "}
          <span className="text-ink">{product.name}</span>
        </nav>
        <ProductInteractive product={product} waNumber={store.whatsapp} />

        <div className="mt-16 grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <section aria-labelledby="deskripsi">
            <h2 id="deskripsi" className="text-3xl">Deskripsi</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-ink">{product.description}</p>
          </section>
          <Reviews product={product} />
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeading eyebrow="Mungkin Anda suka" title="Produk Terkait" />
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  );
}

/** Schema.org Product + AggregateRating + Review untuk rich result Google. Escaping "<" mencegah XSS. */
function jsonLd(p: ProductDetail) {
  const url = `${site.url}/produk/${p.slug}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.gallery.map((g) => new URL(g.url, site.url).toString()),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: site.name },
    material: p.material,
    color: p.variants.map((v) => v.colorName).join(", "),
    offers: {
      "@type": "AggregateOffer",
      url,
      priceCurrency: "IDR",
      lowPrice: p.price,
      highPrice: p.compareAtPrice ?? p.price,
      offerCount: p.variants.length,
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(p.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount },
      review: p.reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.createdAt.slice(0, 10),
        reviewBody: r.body ?? undefined,
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      })),
    }),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
