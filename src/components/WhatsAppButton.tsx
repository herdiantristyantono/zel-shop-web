"use client";

import { useEffect, useSyncExternalStore } from "react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

// Store kecil agar halaman produk bisa memberi tahu tombol WA nama produk yang sedang dilihat.
let current: string | null = null;
const listeners = new Set<() => void>();
const store = {
  set(v: string | null) {
    current = v;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function WhatsAppProduct({ name }: { name: string }) {
  useEffect(() => {
    store.set(name);
    return () => store.set(null);
  }, [name]);
  return null;
}

export function WhatsAppButton() {
  const product = useSyncExternalStore(store.subscribe, () => current, () => null);
  const message = product ? `Halo ${site.name}, saya mau tanya produk ${product}` : `Halo ${site.name}, saya mau tanya produk`;
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E7E45] text-white shadow-lg shadow-ink/20 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      aria-label="Chat WhatsApp Zel Shop"
    >
      <WhatsAppIcon />
    </a>
  );
}
