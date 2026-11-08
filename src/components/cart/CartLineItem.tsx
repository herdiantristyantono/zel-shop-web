"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removeCartItem, updateCartItem } from "@/actions/cart";
import type { CartLine } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { ProductImage } from "../ProductImage";

const ISSUE_TEXT: Record<NonNullable<CartLine["issue"]>, (l: CartLine) => string> = {
  OUT_OF_STOCK: () => "Stok habis — hapus untuk melanjutkan checkout.",
  INSUFFICIENT: (l) => `Stok tersisa ${l.stock}. Kurangi jumlah untuk melanjutkan.`,
  UNAVAILABLE: () => "Produk tidak lagi tersedia — hapus untuk melanjutkan.",
};

export function CartLineItem({ line }: { line: CartLine }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? null));
    });

  return (
    <li className={`flex gap-4 py-6 transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <Link href={`/produk/${line.productSlug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-blush sm:h-28 sm:w-28">
        {line.image && <ProductImage src={line.image} alt={line.productName} fill sizes="112px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/produk/${line.productSlug}`} className="font-medium text-ink hover:text-plum">{line.productName}</Link>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <span className="h-3 w-3 rounded-full ring-1 ring-ink/20" style={{ background: line.colorHex }} />
              {line.colorName}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-ink">{rupiah(line.unitPrice * line.quantity)}</p>
            {line.quantity > 1 && <p className="text-xs text-muted">{rupiah(line.unitPrice)} / pcs</p>}
            {line.compareAtPrice && <p className="text-xs text-muted line-through">{rupiah(line.compareAtPrice * line.quantity)}</p>}
          </div>
        </div>
        {line.issue && <p className="mt-2 text-sm font-medium text-danger" role="alert">{ISSUE_TEXT[line.issue](line)}</p>}
        {error && !line.issue && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          {line.issue === "OUT_OF_STOCK" || line.issue === "UNAVAILABLE" ? (
            <span />
          ) : (
            <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label={`Jumlah ${line.productName}`}>
              <button type="button" disabled={pending || line.quantity <= 1} onClick={() => run(() => updateCartItem(line.id, line.quantity - 1))} className="h-11 w-11 text-lg disabled:opacity-40" aria-label="Kurangi">−</button>
              <span className="w-7 text-center tabular-nums">{line.quantity}</span>
              <button type="button" disabled={pending || line.quantity >= line.stock} onClick={() => run(() => updateCartItem(line.id, line.quantity + 1))} className="h-11 w-11 text-lg disabled:opacity-40" aria-label="Tambah">+</button>
            </div>
          )}
          <button type="button" disabled={pending} onClick={() => run(() => removeCartItem(line.id))} className="min-h-11 px-2 text-sm text-muted underline underline-offset-2 hover:text-danger">
            Hapus
          </button>
        </div>
      </div>
    </li>
  );
}
