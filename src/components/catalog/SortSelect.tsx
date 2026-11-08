"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SortSelect({ options }: { options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Urutkan</span>
      <select
        className="input w-auto rounded-full py-0 pr-8 text-sm"
        value={sp.get("sort") ?? "terbaru"}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("sort", e.target.value);
          p.delete("page");
          start(() => router.replace(`${pathname}?${p}`, { scroll: false }));
        }}
        aria-label="Urutkan produk"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
