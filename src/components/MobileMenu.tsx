"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CloseIcon, MenuIcon } from "./icons";
import { SearchBox } from "./SearchBox";

type Cat = { name: string; slug: string };

export function MobileMenu({ categories }: { categories: Cat[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  useEffect(() => {
    const d = ref.current;
    const onClick = (e: MouseEvent) => e.target === d && d?.close();
    d?.addEventListener("click", onClick);
    return () => d?.removeEventListener("click", onClick);
  }, []);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush lg:hidden" aria-label="Buka menu">
        <MenuIcon />
      </button>
      <dialog ref={ref} className="m-0 h-dvh max-h-none w-[86vw] max-w-sm bg-cream p-0 backdrop:bg-ink/40" aria-label="Menu">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-serif text-xl tracking-[0.2em] text-plum">MENU</span>
            <button type="button" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup menu">
              <CloseIcon />
            </button>
          </div>
          <div className="p-4">
            <SearchBox onNavigate={close} />
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-6" aria-label="Kategori">
            <p className="eyebrow px-3 pb-2 pt-2">Kategori</p>
            <ul>
              {[{ name: "Semua Produk", slug: "" }, ...categories].map((c) => (
                <li key={c.slug}>
                  <Link onClick={close} href={c.slug ? `/kategori/${c.slug}` : "/produk"} className="flex min-h-12 items-center rounded-xl px-3 text-base text-ink hover:bg-blush">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow px-3 pb-2 pt-6">Lainnya</p>
            <ul>
              {[
                ["Promo", "/promo"],
                ["Wishlist", "/wishlist"],
                ["Akun Saya", "/akun"],
                ["Cara Belanja", "/info/cara-belanja"],
                ["FAQ", "/info/faq"],
                ["Kontak", "/info/kontak"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link onClick={close} href={href} className="flex min-h-12 items-center rounded-xl px-3 text-base text-ink hover:bg-blush">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
