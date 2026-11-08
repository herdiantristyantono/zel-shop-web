"use client";

import { useOptimistic, useTransition } from "react";
import { setProductPublished } from "@/actions/admin/products";

export function PublishToggle({ id, published, name }: { id: string; published: boolean; name: string }) {
  const [value, setValue] = useOptimistic(published);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={`Tampilkan ${name} di toko`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setValue(!value);
          await setProductPublished(id, !value);
        })
      }
      className="flex min-h-11 items-center gap-2 text-xs"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-plum" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </span>
      <span className={value ? "text-plum" : "text-muted"}>{value ? "Tampil" : "Sembunyi"}</span>
    </button>
  );
}
