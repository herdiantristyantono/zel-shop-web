import type { ProductDetail } from "@/lib/catalog";
import { Stars } from "../Stars";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export function Reviews({ product }: { product: ProductDetail }) {
  return (
    <section id="ulasan" className="scroll-mt-40" aria-labelledby="ulasan-title">
      <h2 id="ulasan-title" className="text-3xl">Ulasan Pembeli</h2>
      {product.ratingCount === 0 ? (
        <p className="mt-4 text-muted">Belum ada ulasan. Ulasan hanya dapat ditulis oleh pembeli terverifikasi setelah pesanan selesai.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <span className="font-serif text-5xl text-plum">{product.ratingAvg.toFixed(1)}</span>
            <div>
              <Stars value={product.ratingAvg} size={18} />
              <p className="mt-1 text-sm text-muted">{product.ratingCount} ulasan dari pembeli terverifikasi</p>
            </div>
          </div>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-ink">{r.author}</span>
                  <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[11px] font-medium text-plum">Pembeli terverifikasi</span>
                  <time className="text-xs text-muted" dateTime={r.createdAt}>{dateFmt.format(new Date(r.createdAt))}</time>
                </div>
                {r.body && <p className="mt-3 leading-relaxed text-ink">{r.body}</p>}
                {r.adminReply && (
                  <div className="mt-3 rounded-xl bg-blush p-4 text-sm">
                    <p className="font-medium text-plum">Balasan Zel Shop</p>
                    <p className="mt-1 text-ink">{r.adminReply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
