import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { getCart } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Keranjang", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Keranjang</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-blush" />}>
        <CartContent />
      </Suspense>
    </div>
  );
}

async function CartContent() {
  const [{ lines, summary }, settings] = await Promise.all([getCart(), getStoreSettings()]);
  if (!lines.length)
    return (
      <div className="mt-8 rounded-[var(--radius-card)] bg-blush px-6 py-16 text-center">
        <h2 className="text-2xl">Keranjang Anda masih kosong</h2>
        <p className="mt-2 text-muted">Yuk, temukan dompet dan tas favorit Anda.</p>
        <Link href="/produk" className="btn-primary mt-6">Mulai belanja</Link>
      </div>
    );

  const freeMin = settings.freeShippingMin;
  const remaining = freeMin != null ? freeMin - summary.subtotal : null;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <CartLineItem key={l.id} line={l} />
        ))}
      </ul>
      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-white p-6 lg:sticky lg:top-32" aria-labelledby="ringkasan">
        <h2 id="ringkasan" className="text-2xl">Ringkasan</h2>
        {remaining != null && (
          <div className="mt-4 rounded-xl bg-blush p-3 text-sm">
            {remaining > 0 ? (
              <>Belanja <strong>{rupiah(remaining)}</strong> lagi untuk gratis ongkir.</>
            ) : (
              <strong className="text-plum">Anda mendapat gratis ongkir!</strong>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden>
              <div className="h-full rounded-full bg-plum" style={{ width: `${Math.min(100, (summary.subtotal / freeMin!) * 100)}%` }} />
            </div>
          </div>
        )}
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal ({summary.count} barang)</dt><dd className="font-medium">{rupiah(summary.subtotal)}</dd></div>
          {summary.savings > 0 && <div className="flex justify-between text-plum"><dt>Anda hemat</dt><dd>-{rupiah(summary.savings)}</dd></div>}
          <div className="flex justify-between text-muted"><dt>Ongkos kirim</dt><dd>Dihitung saat checkout</dd></div>
          <div className="flex justify-between text-muted"><dt>Kupon</dt><dd>Masukkan saat checkout</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">Total sementara</dt><dd className="font-semibold">{rupiah(summary.subtotal)}</dd></div>
        </dl>
        {summary.hasIssues ? (
          <p className="mt-5 rounded-xl bg-[#FBE9EC] p-3 text-sm text-danger" role="alert">Ada produk dengan stok bermasalah. Perbaiki dulu sebelum checkout.</p>
        ) : (
          <Link href="/checkout" className="btn-primary mt-6 h-12 w-full">Checkout</Link>
        )}
        <Link href="/produk" className="btn-ghost mt-2 w-full">Lanjut belanja</Link>
      </aside>
    </div>
  );
}
