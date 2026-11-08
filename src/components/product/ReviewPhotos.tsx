"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/** Foto ulasan: thumbnail kecil, ketuk untuk melihat besar. */
export function ReviewPhotos({ images, author }: { images: string[]; author: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  if (images.length === 0) return null;
  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2">
        {images.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => {
                setActive(i);
                ref.current?.showModal();
              }}
              className="relative block h-20 w-20 overflow-hidden rounded-lg border border-line bg-cream"
              aria-label={`Lihat foto ${i + 1} dari ${author}`}
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        className="m-auto max-h-[92dvh] w-[min(92vw,720px)] overflow-hidden rounded-2xl bg-white p-0 backdrop:bg-ink/70"
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        onClose={() => setActive(null)}
        aria-label={`Foto ulasan dari ${author}`}
      >
        <div className="relative h-[min(72dvh,640px)] w-full bg-cream">
          {active != null && <Image src={images[active]} alt={`Foto ulasan ${active + 1} dari ${author}`} fill sizes="(max-width: 768px) 92vw, 720px" className="object-contain" loading="eager" />}
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="flex gap-1">
            {images.length > 1 &&
              images.map((_, i) => (
                <button key={i} type="button" onClick={() => setActive(i)} aria-label={`Foto ${i + 1}`} aria-current={i === active} className="flex h-11 w-11 items-center justify-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${i === active ? "bg-plum" : "bg-line"}`} />
                </button>
              ))}
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="btn-ghost" autoFocus>Tutup</button>
        </div>
      </dialog>
    </>
  );
}
