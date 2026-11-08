"use client";

import { useEffect, useId, useState } from "react";
import { findAreas } from "@/actions/checkout";
import type { Area } from "@/lib/shipping";

/** Cari kecamatan/kota/kode pos (Biteship Maps). */
export function AreaSearch({ value, onSelect, error }: { value: Area | null; onSelect: (a: Area) => void; error?: string }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Area[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) return;
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await findAreas(q);
      if (live) {
        setResults(r);
        setLoading(false);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="relative">
      <label htmlFor={id} className="label">Kecamatan / Kota / Kode pos</label>
      {value && !open ? (
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2 text-sm">
          <span>{value.district}, {value.city}, {value.province} {value.postalCode}</span>
          <button type="button" onClick={() => setOpen(true)} className="min-h-9 shrink-0 text-plum underline">Ubah</button>
        </div>
      ) : (
        <input
          id={id}
          className="input"
          value={q}
          autoFocus={Boolean(value)}
          placeholder="Ketik min. 3 huruf, mis. Coblong atau 40132"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={`${id}-list`}
          aria-invalid={Boolean(error)}
          autoComplete="off"
        />
      )}
      {open && q.trim().length >= 3 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
          {loading && <li className="p-3 text-sm text-muted">Mencari…</li>}
          {!loading && results.length === 0 && <li className="p-3 text-sm text-muted">Wilayah tidak ditemukan.</li>}
          {!loading &&
            results.map((a) => (
              <li key={a.id} role="option" aria-selected={value?.id === a.id}>
                <button
                  type="button"
                  className="min-h-11 w-full px-4 py-2 text-left text-sm hover:bg-cream"
                  onClick={() => {
                    onSelect(a);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {a.label}
                </button>
              </li>
            ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
