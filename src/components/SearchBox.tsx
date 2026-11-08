"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { rupiah } from "@/lib/format";
import { SearchIcon } from "./icons";

type Suggestion = {
  products: { name: string; slug: string; price: number; image: string | null }[];
  categories: { name: string; slug: string }[];
};

export function SearchBox({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setData(await res.json());
          setActive(-1);
        }
      } catch {}
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = q.trim().length >= 2 && data ? data.products : [];
  const showList = open && q.trim().length >= 2 && data !== null;

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) return go(`/produk/${items[active].slug}`);
          if (q.trim()) go(`/produk?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">Cari produk</label>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          id={`${listId}-input`}
          type="search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Cari dompet, tas selempang…"
          className="input rounded-full bg-cream pl-11"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
        />
      </form>
      {showList && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-plum/5">
          {data.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-line p-3">
              {data.categories.map((c) => (
                <Link key={c.slug} href={`/kategori/${c.slug}`} onClick={() => (setOpen(false), onNavigate?.())} className="rounded-full bg-blush px-3 py-1.5 text-sm text-plum">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted">Tidak ada produk untuk “{q}”.</p>
          ) : (
            <ul>
              {items.map((p, i) => (
                <li key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => go(`/produk/${p.slug}`)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left ${i === active ? "bg-cream" : ""}`}
                  >
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" width={44} height={44} className="h-11 w-11 rounded-lg bg-blush object-cover" />
                    )}
                    <span className="flex-1 text-sm text-ink">{p.name}</span>
                    <span className="text-sm font-medium text-ink">{rupiah(p.price)}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => go(`/produk?q=${encodeURIComponent(q.trim())}`)} className="min-h-11 w-full border-t border-line px-4 text-left text-sm font-medium text-plum">
                  Lihat semua hasil untuk “{q.trim()}”
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
