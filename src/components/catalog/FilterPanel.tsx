"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { CloseIcon, FilterIcon, StarIcon } from "../icons";

type Option = { value: string; label: string; hex?: string };
type Props = {
  categories: Option[] | null; // null = halaman kategori (kategori tetap)
  colors: Option[];
  materials: Option[];
  activeCount: number;
};

const SIZES: Option[] = [
  { value: "MINI", label: "Mini" },
  { value: "SMALL", label: "Kecil" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "LARGE", label: "Besar" },
];
const PRICES = [
  { label: "< Rp 100.000", min: "", max: "100000" },
  { label: "Rp 100.000 – 200.000", min: "100000", max: "200000" },
  { label: "Rp 200.000 – 300.000", min: "200000", max: "300000" },
  { label: "> Rp 300.000", min: "300000", max: "" },
];

export function FilterPanel(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="btn-outline px-4 lg:hidden">
        <FilterIcon size={18} /> Filter{props.activeCount > 0 && ` (${props.activeCount})`}
      </button>
      <dialog ref={dialog} className="m-0 ml-auto h-dvh max-h-none w-[90vw] max-w-sm bg-cream p-0 backdrop:bg-ink/40" aria-label="Filter produk">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-serif text-2xl text-plum">Filter</span>
            <button type="button" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup filter">
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <Filters {...props} />
          </div>
          <div className="border-t border-line p-4">
            <button type="button" onClick={() => dialog.current?.close()} className="btn-primary w-full">Lihat hasil</button>
          </div>
        </div>
      </dialog>
      <aside className="hidden lg:block" aria-label="Filter produk">
        <Filters {...props} />
      </aside>
    </>
  );
}

function Filters({ categories, colors, materials }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const values = (key: string) => (sp.get(key) ?? "").split(",").filter(Boolean);
  function update(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }
  function toggle(key: string, value: string) {
    update((p) => {
      const cur = new Set(values(key));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) p.set(key, [...cur].join(","));
      else p.delete(key);
    });
  }
  const hasAny = ["kategori", "warna", "ukuran", "bahan", "min", "max", "rating", "diskon"].some((k) => sp.has(k));

  return (
    <div className={`divide-y divide-line transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      {hasAny && (
        <div className="py-3">
          <button
            type="button"
            onClick={() => update((p) => ["kategori", "warna", "ukuran", "bahan", "min", "max", "rating", "diskon"].forEach((k) => p.delete(k)))}
            className="min-h-11 text-sm font-medium text-plum underline underline-offset-2"
          >
            Hapus semua filter
          </button>
        </div>
      )}
      <Group title="Promo">
        <Check label="Sedang diskon" checked={sp.get("diskon") === "1"} onChange={() => update((p) => (p.get("diskon") === "1" ? p.delete("diskon") : p.set("diskon", "1")))} />
      </Group>
      {categories && (
        <Group title="Kategori">
          {categories.map((c) => (
            <Check key={c.value} label={c.label} checked={values("kategori").includes(c.value)} onChange={() => toggle("kategori", c.value)} />
          ))}
        </Group>
      )}
      <Group title="Harga">
        {PRICES.map((r) => {
          const checked = (sp.get("min") ?? "") === r.min && (sp.get("max") ?? "") === r.max;
          return (
            <Check
              key={r.label}
              type="radio"
              label={r.label}
              checked={checked}
              onChange={() =>
                update((p) => {
                  p.delete("min");
                  p.delete("max");
                  if (!checked) {
                    if (r.min) p.set("min", r.min);
                    if (r.max) p.set("max", r.max);
                  }
                })
              }
            />
          );
        })}
      </Group>
      <Group title="Warna">
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const on = values("warna").includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle("warna", c.value)}
                aria-pressed={on}
                className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-plum bg-plum-soft text-plum" : "border-line bg-white text-ink"}`}
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-ink/20" style={{ background: c.hex }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="Ukuran">
        {SIZES.map((s) => (
          <Check key={s.value} label={s.label} checked={values("ukuran").includes(s.value)} onChange={() => toggle("ukuran", s.value)} />
        ))}
      </Group>
      <Group title="Bahan">
        {materials.map((m) => (
          <Check key={m.value} label={m.label} checked={values("bahan").includes(m.value)} onChange={() => toggle("bahan", m.value)} />
        ))}
      </Group>
      <Group title="Rating">
        {[4, 3].map((r) => (
          <Check
            key={r}
            type="radio"
            label={
              <span className="inline-flex items-center gap-1">
                <StarIcon size={14} className="text-[#B07A2E]" /> {r} ke atas
              </span>
            }
            checked={sp.get("rating") === String(r)}
            onChange={() => update((p) => (p.get("rating") === String(r) ? p.delete("rating") : p.set("rating", String(r))))}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-4">
      <legend className="float-left mb-2 w-full text-xs font-semibold uppercase tracking-[0.2em] text-ink">{title}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: () => void; type?: "radio" }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded accent-plum" />
      {label}
    </label>
  );
}
