"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { getReviewUploadTarget, submitReview, toReviewDeliveryUrl } from "@/actions/order";
import { StarIcon } from "../icons";
import { checkImageFile, uploadToTarget } from "../upload-client";

const MAX_PHOTOS = 3;

export function ReviewForm({ orderItemId, productName }: { orderItemId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    setMsg(null);
    setUploading(list.length);
    try {
      const target = await getReviewUploadTarget(orderItemId);
      if (!target.ok) throw new Error(target.error);
      for (const f of list) {
        checkImageFile(f);
        const up = await uploadToTarget(f, target.data, `/api/reviews/upload?item=${encodeURIComponent(orderItemId)}`, toReviewDeliveryUrl);
        if (!up.url) throw new Error("Upload gagal");
        setPhotos((p) => [...p, up.url].slice(0, MAX_PHOTOS));
        setUploading((n) => n - 1);
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload gagal" });
    } finally {
      setUploading(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (msg?.ok) return <p className="mt-2 text-sm text-plum" role="status">{msg.text}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-11 text-sm font-medium text-plum underline underline-offset-2">
        Tulis ulasan
      </button>
    );
  const inputId = `photos-${orderItemId}`;
  return (
    <form
      className="mt-2 space-y-3 rounded-xl bg-cream p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitReview({ orderItemId, rating, body, images: photos });
          setMsg(r.ok ? { ok: true, text: r.message ?? "Terkirim" } : { ok: false, text: r.error });
        });
      }}
    >
      <fieldset>
        <legend className="text-sm text-ink">Rating untuk {productName}</legend>
        <div className="mt-1 flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} bintang`} aria-pressed={rating === n} className="flex h-11 w-11 items-center justify-center text-[#B07A2E]">
              <StarIcon size={26} filled={rating >= n} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="sr-only">Ulasan</span>
        <textarea className="input min-h-20 py-3 text-sm" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ceritakan kualitas bahan, ukuran, dan warnanya…" />
      </label>

      <div>
        <p className="text-sm text-ink">Foto produk <span className="text-muted">(opsional, maks. {MAX_PHOTOS})</span></p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <li key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-white">
              <Image src={url} alt={`Foto ulasan ${i + 1}`} fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                aria-label={`Hapus foto ${i + 1}`}
                className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-bl-lg bg-ink/75 text-lg leading-none text-white"
              >
                ×
              </button>
            </li>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <li key={`up-${i}`} className="h-20 w-20 animate-pulse rounded-lg bg-line" aria-hidden />
          ))}
          {photos.length + uploading < MAX_PHOTOS && (
            <li>
              <label htmlFor={inputId} className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-plum/50 bg-white text-xs text-plum focus-within:ring-2 focus-within:ring-plum">
                <span className="text-2xl leading-none" aria-hidden>+</span>
                Tambah foto
                <input id={inputId} ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              </label>
            </li>
          )}
        </ul>
        {uploading > 0 && <p className="mt-1 text-xs text-muted" role="status">Mengunggah foto…</p>}
      </div>

      {msg && !msg.ok && <p className="text-sm text-danger" role="alert">{msg.text}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || rating === 0 || uploading > 0} className="btn-primary">Kirim ulasan</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Batal</button>
      </div>
    </form>
  );
}
