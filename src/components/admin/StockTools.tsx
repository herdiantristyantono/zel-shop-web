"use client";

import { useRef, useState, useTransition } from "react";
import { adjustStock, importProductsCsv } from "@/actions/admin/stock";
import { Notice } from "./forms";

export function StockAdjust({ variantId, label }: { variantId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<"RESTOCK" | "ADJUSTMENT" | "RETURN">("RESTOCK");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm text-plum underline">
        Ubah stok
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await adjustStock({ variantId, change: Number(qty), reason, note });
          setMsg(r.ok ? { ok: true, text: r.message ?? "OK" } : { ok: false, text: r.error });
          if (r.ok) {
            setQty("");
            setNote("");
          }
        });
      }}
      aria-label={`Ubah stok ${label}`}
    >
      <label className="text-xs">
        <span className="block text-muted">Jumlah (+/−)</span>
        <input className="input min-h-10 w-24" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="+10" required />
      </label>
      <label className="text-xs">
        <span className="block text-muted">Alasan</span>
        <select className="input min-h-10 w-auto" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          <option value="RESTOCK">Barang masuk</option>
          <option value="RETURN">Retur pembeli</option>
          <option value="ADJUSTMENT">Penyesuaian / rusak / hilang</option>
        </select>
      </label>
      <label className="text-xs">
        <span className="block text-muted">Catatan</span>
        <input className="input min-h-10 w-40" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </label>
      <button disabled={pending || !qty} className="btn-primary min-h-10 px-4">Simpan</button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-10 px-3">Tutup</button>
      {msg && <span className={`w-full text-xs ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.text}</span>}
    </form>
  );
}

export function CsvImport() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Langkah: <strong>Export CSV</strong> → ubah kolom <code>stock</code>, <code>price</code>, <code>compare_at_price</code>, <code>variant_price</code>, atau <code>published</code> (1/0) di Excel → simpan sebagai CSV → import di sini. Baris dicocokkan berdasarkan <code>sku</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/admin/products.csv" className="btn-outline">Export CSV</a>
        <button type="button" disabled={pending} onClick={() => input.current?.click()} className="btn-primary">
          {pending ? "Mengimpor…" : "Import CSV"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Pilih file CSV"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            start(async () => {
              const r = await importProductsCsv(await f.text());
              setResult(r.ok ? { ok: true, text: r.message ?? "Selesai" } : { ok: false, text: r.error });
              setErrors(r.ok ? (r.data?.errors ?? []) : []);
            });
          }}
        />
      </div>
      <Notice result={result} />
      {errors.length > 0 && (
        <ul className="max-h-48 list-disc overflow-y-auto pl-5 text-xs text-danger">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
