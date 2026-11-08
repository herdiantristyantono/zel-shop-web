"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/actions/order";
import { StarIcon } from "../icons";

export function ReviewForm({ orderItemId, productName }: { orderItemId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (msg?.ok) return <p className="mt-2 text-sm text-plum" role="status">{msg.text}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-11 text-sm font-medium text-plum underline underline-offset-2">
        Tulis ulasan
      </button>
    );
  return (
    <form
      className="mt-2 space-y-3 rounded-xl bg-cream p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitReview({ orderItemId, rating, body });
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
      {msg && !msg.ok && <p className="text-sm text-danger" role="alert">{msg.text}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || rating === 0} className="btn-primary">Kirim ulasan</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Batal</button>
      </div>
    </form>
  );
}
