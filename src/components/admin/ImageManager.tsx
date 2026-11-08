"use client";

import { useRef, useState } from "react";
import { ProductImage } from "../ProductImage";
import { uploadImage } from "./uploadImage";

export type ImageItem = { key: string; id?: string; url: string; alt: string; variantRef: string | null; width?: number | null; height?: number | null };

/**
 * Kelola foto: seret-lepas file untuk unggah (banyak sekaligus), seret kartu untuk mengurutkan,
 * tombol ↑/↓ untuk keyboard, foto pertama = foto utama, tautkan foto ke warna tertentu.
 */
export function ImageManager({
  images,
  onChange,
  variants,
  folder = "products",
}: {
  images: ImageItem[];
  onChange: (next: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
  variants?: { ref: string; label: string }[];
  folder?: "products" | "banners";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 20);
    setErrors([]);
    setUploading((n) => n + list.length);
    // Unggah paralel terbatas (3 sekaligus)
    const queue = [...list];
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift()!;
        try {
          const up = await uploadImage(f, folder);
          onChange((prev) => [...prev, { key: crypto.randomUUID(), url: up.url, alt: "", variantRef: null, width: up.width, height: up.height }]);
        } catch (e) {
          setErrors((er) => [...er, (e as Error).message]);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  const move = (from: number, to: number) =>
    onChange((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  const update = (key: string, patch: Partial<ImageItem>) => onChange((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm ${dragOver ? "border-plum bg-plum-soft" : "border-line bg-cream"}`}
      >
        <p className="text-ink">Seret & lepas foto ke sini</p>
        <p className="mt-1 text-xs text-muted">JPG, PNG, WebP, HEIC · maks. 8 MB · otomatis dikompres ke WebP</p>
        <button type="button" onClick={() => input.current?.click()} className="btn-outline mt-3">Pilih file</button>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} aria-label="Pilih foto" />
        {uploading > 0 && <p className="mt-3 text-sm text-plum" role="status">Mengunggah {uploading} foto…</p>}
      </div>
      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-danger" role="alert">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {images.length > 0 && (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.key}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (e.dataTransfer.files.length) return;
                e.preventDefault();
                if (dragIndex.current != null) move(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className={`rounded-xl border bg-white p-2 ${i === 0 ? "border-plum" : "border-line"}`}
            >
              <div className="relative aspect-square cursor-grab overflow-hidden rounded-lg bg-blush active:cursor-grabbing">
                <ProductImage src={img.url} alt={img.alt || `Foto ${i + 1}`} fill sizes="200px" className="object-cover" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-plum px-2 py-0.5 text-[11px] font-semibold text-white">Utama</span>}
              </div>
              <label className="sr-only" htmlFor={`alt-${img.key}`}>Teks alternatif foto {i + 1}</label>
              <input id={`alt-${img.key}`} className="input mt-2 min-h-9 px-2 text-xs" placeholder="Deskripsi foto (alt)" value={img.alt} maxLength={160} onChange={(e) => update(img.key, { alt: e.target.value })} />
              {variants && variants.length > 0 && (
                <>
                  <label className="sr-only" htmlFor={`var-${img.key}`}>Warna untuk foto {i + 1}</label>
                  <select id={`var-${img.key}`} className="input mt-1 min-h-9 px-2 text-xs" value={img.variantRef ?? ""} onChange={(e) => update(img.key, { variantRef: e.target.value || null })}>
                    <option value="">Semua warna</option>
                    {variants.map((v) => <option key={v.ref} value={v.ref}>{v.label}</option>)}
                  </select>
                </>
              )}
              <div className="mt-1 flex items-center justify-between">
                <div className="flex">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="h-9 w-9 rounded-lg text-ink hover:bg-cream disabled:opacity-30" aria-label={`Geser foto ${i + 1} ke kiri`}>↑</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} className="h-9 w-9 rounded-lg text-ink hover:bg-cream disabled:opacity-30" aria-label={`Geser foto ${i + 1} ke kanan`}>↓</button>
                </div>
                {i !== 0 && <button type="button" onClick={() => move(i, 0)} className="min-h-9 px-1 text-xs text-plum underline">Jadikan utama</button>}
                <button type="button" onClick={() => onChange((prev) => prev.filter((x) => x.key !== img.key))} className="min-h-9 px-1 text-xs text-danger underline" aria-label={`Hapus foto ${i + 1}`}>Hapus</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
