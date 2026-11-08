"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moveWishlistToCart, setWishlistNotify, toggleWishlist } from "@/actions/wishlist";
import { Price } from "../Price";
import { ProductImage } from "../ProductImage";

type Item = {
  productId: string;
  name: string;
  slug: string;
  image: { url: string; alt: string } | null;
  price: number;
  compareAt: number | null;
  variants: { id: string; colorName: string; colorHex: string; stock: number }[];
  notifyOnSale: boolean;
  notifyOnRestock: boolean;
};

export function WishlistItemCard({ item }: { item: Item }) {
  const inStock = item.variants.filter((v) => v.stock > 0);
  const [variantId, setVariantId] = useState(inStock[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className={`flex gap-4 rounded-2xl border border-line bg-white p-4 ${pending ? "opacity-60" : ""}`}>
      <Link href={`/produk/${item.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-blush">
        {item.image && <ProductImage src={item.image.url} alt={item.image.alt} fill sizes="112px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link href={`/produk/${item.slug}`} className="font-medium text-ink hover:text-plum">{item.name}</Link>
        <Price price={item.price} compareAt={item.compareAt} />
        {inStock.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`v-${item.productId}`}>Warna</label>
            <select id={`v-${item.productId}`} className="input min-h-11 w-auto py-0 text-sm" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {inStock.map((v) => (
                <option key={v.id} value={v.id}>{v.colorName}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              className="btn-primary px-4"
              onClick={() =>
                start(async () => {
                  const r = await moveWishlistToCart(item.productId, variantId);
                  setMsg(r.ok ? { ok: true, text: "Dipindahkan ke keranjang" } : { ok: false, text: r.error });
                })
              }
            >
              Pindah ke keranjang
            </button>
          </div>
        ) : (
          <p className="text-sm font-medium text-danger">Stok habis</p>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-plum" : "text-danger"}`} role="status">{msg.text}</p>}
        <div className="flex flex-wrap gap-x-4 text-sm">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-plum" defaultChecked={item.notifyOnSale} onChange={(e) => start(() => setWishlistNotify(item.productId, "notifyOnSale", e.target.checked))} />
            Kabari saat diskon
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-plum" defaultChecked={item.notifyOnRestock} onChange={(e) => start(() => setWishlistNotify(item.productId, "notifyOnRestock", e.target.checked))} />
            Kabari saat stok kembali
          </label>
          <button type="button" disabled={pending} onClick={() => start(async () => void (await toggleWishlist(item.productId)))} className="min-h-11 text-muted underline hover:text-danger">
            Hapus
          </button>
        </div>
      </div>
    </li>
  );
}
