"use client";

import Link from "next/link";
import Script from "next/script";
import { useSyncExternalStore } from "react";

const GA = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const KEY = "zel_consent"; // "yes" | "no"
const EVENT = "zel-consent";

function readConsent(): "yes" | "no" | null {
  try {
    return localStorage.getItem(KEY) as "yes" | "no" | null;
  } catch {
    return null;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/**
 * Google Analytics 4 + Meta Pixel, dimuat HANYA setelah pengunjung menyetujui (UU PDP).
 * Tanpa ID di env, komponen ini tidak menampilkan apa pun.
 */
export function Analytics() {
  // undefined saat SSR → banner tidak berkedip sebelum hidrasi
  const consent = useSyncExternalStore(subscribe, readConsent, () => undefined);
  if (!GA && !PIXEL) return null;

  const choose = (v: "yes" | "no") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <>
      {consent === "yes" && GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === "yes" && PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}
        </Script>
      )}
      {consent === null && (
        <div role="dialog" aria-label="Persetujuan cookie" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-xl sm:inset-x-6">
          <p className="text-sm text-ink">
            Kami memakai cookie analitik untuk memahami cara pengunjung berbelanja dan meningkatkan layanan. Baca <Link href="/info/kebijakan-privasi" className="text-plum underline">Kebijakan Privasi</Link>.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => choose("no")} className="btn-ghost">Tolak</button>
            <button type="button" onClick={() => choose("yes")} className="btn-primary">Setuju</button>
          </div>
        </div>
      )}
    </>
  );
}

type Item = { id: string; name: string; price: number; quantity: number };

/** Kirim event e-commerce ke GA4 & Pixel (jika sudah disetujui & termuat). */
export function track(event: "add_to_cart" | "begin_checkout" | "purchase", data: { value: number; items: Item[]; transactionId?: string }) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
  w.gtag?.("event", event, {
    currency: "IDR",
    value: data.value,
    transaction_id: data.transactionId,
    items: data.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
  });
  const pixelEvent = { add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase" }[event];
  w.fbq?.("track", pixelEvent, { currency: "IDR", value: data.value, content_ids: data.items.map((i) => i.id), content_type: "product" });
}
