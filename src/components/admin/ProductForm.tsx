"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, saveProduct } from "@/actions/admin/products";
import { slugify } from "@/lib/format";
import { Field, Notice, Toggle } from "./forms";
import { ImageManager, type ImageItem } from "./ImageManager";

type Variant = { key: string; id?: string; colorName: string; colorHex: string; sku: string; stock: string; priceOverride: string; isActive: boolean };
export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  material: string;
  size: "MINI" | "SMALL" | "MEDIUM" | "LARGE";
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightGram: string;
  cardSlots: string;
  compartments: string;
  price: string;
  compareAtPrice: string;
  isPublished: boolean;
  isFeatured: boolean;
  minStockAlert: string;
  metaTitle: string;
  metaDescription: string;
  variants: Variant[];
  images: ImageItem[];
};

export const emptyProduct: ProductFormValue = {
  name: "", slug: "", categoryId: "", description: "", material: "", size: "MEDIUM", lengthCm: "", widthCm: "", heightCm: "", weightGram: "",
  cardSlots: "", compartments: "", price: "", compareAtPrice: "", isPublished: true, isFeatured: false, minStockAlert: "3", metaTitle: "", metaDescription: "",
  variants: [{ key: "v0", colorName: "Hitam", colorHex: "#1F1A1C", sku: "", stock: "0", priceOverride: "", isActive: true }],
  images: [],
};

const SIZES = [["MINI", "Mini"], ["SMALL", "Kecil"], ["MEDIUM", "Sedang"], ["LARGE", "Besar"]] as const;

export function ProductForm({ initial, categories }: { initial: ProductFormValue; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const text = (k: keyof ProductFormValue) => ({
    id: `f-${k}`,
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
    "aria-invalid": Boolean(errors[k]),
  });
  const ref = (vr: Variant) => vr.id ?? `new:${vr.key}`;
  const setVariant = (key: string, patch: Partial<Variant>) => set("variants", v.variants.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function submit() {
    setResult(null);
    start(async () => {
      const res = await saveProduct({
        id: v.id,
        name: v.name,
        slug: v.slug,
        categoryId: v.categoryId,
        description: v.description,
        material: v.material,
        size: v.size,
        lengthCm: v.lengthCm,
        widthCm: v.widthCm,
        heightCm: v.heightCm,
        weightGram: v.weightGram,
        cardSlots: v.cardSlots,
        compartments: v.compartments,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        isPublished: v.isPublished,
        isFeatured: v.isFeatured,
        minStockAlert: v.minStockAlert,
        metaTitle: v.metaTitle,
        metaDescription: v.metaDescription,
        variants: v.variants.map((x) => ({ id: x.id, ref: ref(x), colorName: x.colorName, colorHex: x.colorHex, sku: x.sku, stock: x.stock, priceOverride: x.priceOverride, isActive: x.isActive })),
        images: v.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, variantRef: i.variantRef, width: i.width ?? null, height: i.height ?? null })),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setResult({ ok: false, text: res.error });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setErrors({});
      setResult({ ok: true, text: res.message ?? "Tersimpan" });
      if (!v.id) router.replace(`/admin/produk/${res.data!.id}`);
      else router.refresh();
    });
  }

  const variantError = (i: number, f: string) => errors[`variants.${i}.${f}`];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6 pb-24"
      noValidate
    >
      <Notice result={result} />
      {errors.variants && <p className="text-sm text-danger" role="alert">{errors.variants}</p>}

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">Informasi produk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama produk" htmlFor="f-name" error={errors.name} className="sm:col-span-2">
            <input className="input" {...text("name")} onBlur={() => !v.slug && set("slug", slugify(v.name))} maxLength={120} />
          </Field>
          <Field label="Slug URL" htmlFor="f-slug" error={errors.slug} hint={`zelshop.id/produk/${slugify(v.slug || v.name) || "…"}`}>
            <input className="input" {...text("slug")} maxLength={140} />
          </Field>
          <Field label="Kategori" htmlFor="f-categoryId" error={errors.categoryId}>
            <select className="input" {...text("categoryId")}>
              <option value="">Pilih kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Deskripsi" htmlFor="f-description" error={errors.description} className="sm:col-span-2">
            <textarea className="input min-h-36 py-3" {...text("description")} maxLength={5000} />
          </Field>
          <Field label="Bahan" htmlFor="f-material" error={errors.material} className="sm:col-span-2">
            <input className="input" {...text("material")} placeholder="mis. Kulit sintetis PU premium" maxLength={160} />
          </Field>
          <Field label="Ruang / kompartemen" htmlFor="f-compartments" className="sm:col-span-2">
            <input className="input" {...text("compartments")} placeholder="mis. 2 ruang utama, 1 kantong resleting" maxLength={300} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">Harga, ukuran & berat</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Harga jual (Rp)" htmlFor="f-price" error={errors.price}><input className="input" inputMode="numeric" {...text("price")} /></Field>
          <Field label="Harga coret (Rp)" htmlFor="f-compareAtPrice" error={errors.compareAtPrice} hint="Kosongkan jika tidak diskon"><input className="input" inputMode="numeric" {...text("compareAtPrice")} /></Field>
          <Field label="Berat kirim (gram)" htmlFor="f-weightGram" error={errors.weightGram}><input className="input" inputMode="numeric" {...text("weightGram")} /></Field>
          <Field label="Ukuran" htmlFor="f-size">
            <select className="input" {...text("size")}>{SIZES.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select>
          </Field>
          <Field label="Panjang (cm)" htmlFor="f-lengthCm" error={errors.lengthCm}><input className="input" inputMode="decimal" {...text("lengthCm")} /></Field>
          <Field label="Lebar (cm)" htmlFor="f-widthCm" error={errors.widthCm}><input className="input" inputMode="decimal" {...text("widthCm")} /></Field>
          <Field label="Tinggi (cm)" htmlFor="f-heightCm" error={errors.heightCm}><input className="input" inputMode="decimal" {...text("heightCm")} /></Field>
          <Field label="Slot kartu" htmlFor="f-cardSlots" hint="Untuk dompet"><input className="input" inputMode="numeric" {...text("cardSlots")} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-base font-semibold text-ink">Varian warna, SKU & stok</h2>
          <button
            type="button"
            className="btn-outline min-h-10 px-4"
            onClick={() => set("variants", [...v.variants, { key: crypto.randomUUID(), colorName: "", colorHex: "#C9A06A", sku: "", stock: "0", priceOverride: "", isActive: true }])}
          >
            + Tambah warna
          </button>
        </div>
        <div className="space-y-3">
          {v.variants.map((x, i) => (
            <fieldset key={x.key} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[auto_1fr_1fr_100px_140px_auto] sm:items-end">
              <legend className="sr-only">Varian {i + 1}</legend>
              <Field label="Warna" htmlFor={`vh-${x.key}`}>
                <input id={`vh-${x.key}`} type="color" className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" value={x.colorHex} onChange={(e) => setVariant(x.key, { colorHex: e.target.value })} />
              </Field>
              <Field label="Nama warna" htmlFor={`vn-${x.key}`} error={variantError(i, "colorName")}>
                <input id={`vn-${x.key}`} className="input" value={x.colorName} onChange={(e) => setVariant(x.key, { colorName: e.target.value })} maxLength={40} />
              </Field>
              <Field label="SKU" htmlFor={`vs-${x.key}`} error={variantError(i, "sku")}>
                <input id={`vs-${x.key}`} className="input font-mono uppercase" value={x.sku} onChange={(e) => setVariant(x.key, { sku: e.target.value.toUpperCase() })} placeholder="ZEL-NAMA-WARNA" maxLength={40} />
              </Field>
              <Field label="Stok" htmlFor={`vk-${x.key}`} error={variantError(i, "stock")}>
                <input id={`vk-${x.key}`} className="input" inputMode="numeric" value={x.stock} onChange={(e) => setVariant(x.key, { stock: e.target.value })} />
              </Field>
              <Field label="Harga khusus" htmlFor={`vp-${x.key}`} error={variantError(i, "priceOverride")}>
                <input id={`vp-${x.key}`} className="input" inputMode="numeric" value={x.priceOverride} onChange={(e) => setVariant(x.key, { priceOverride: e.target.value })} placeholder="opsional" />
              </Field>
              <div className="flex items-center gap-2">
                <Toggle id={`va-${x.key}`} label="Aktif" checked={x.isActive} onChange={(isActive) => setVariant(x.key, { isActive })} />
                {v.variants.length > 1 && (
                  <button type="button" onClick={() => set("variants", v.variants.filter((y) => y.key !== x.key))} className="min-h-11 px-2 text-sm text-danger underline" aria-label={`Hapus varian ${x.colorName || i + 1}`}>
                    Hapus
                  </button>
                )}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-4 max-w-xs">
          <Field label="Peringatan stok minimum" htmlFor="f-minStockAlert" hint="Tampil di 'Stok menipis' jika stok ≤ angka ini"><input className="input" inputMode="numeric" {...text("minStockAlert")} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-1 font-sans text-base font-semibold text-ink">Foto produk</h2>
        <p className="mb-4 text-sm text-muted">Foto pertama menjadi foto utama. Unggah beberapa sudut: depan, samping, dalam, detail.</p>
        <ImageManager
          images={v.images}
          onChange={(next) => setV((p) => ({ ...p, images: typeof next === "function" ? next(p.images) : next }))}
          variants={v.variants.map((x) => ({ ref: ref(x), label: x.colorName || "(tanpa nama)" }))}
        />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">Tampilan & SEO</h2>
        <div className="flex flex-wrap gap-x-6">
          <Toggle id="f-pub" label="Tampilkan di toko" checked={v.isPublished} onChange={(b) => set("isPublished", b)} />
          <Toggle id="f-feat" label="Produk unggulan" checked={v.isFeatured} onChange={(b) => set("isFeatured", b)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Judul SEO" htmlFor="f-metaTitle" hint={`${v.metaTitle.length}/70 · kosong = nama produk`}><input className="input" {...text("metaTitle")} maxLength={70} /></Field>
          <Field label="Deskripsi SEO" htmlFor="f-metaDescription" hint={`${v.metaDescription.length}/160 · kosong = awal deskripsi`}><input className="input" {...text("metaDescription")} maxLength={160} /></Field>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:left-[240px]">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {v.id && (
            <button
              type="button"
              disabled={pending}
              className="mr-auto min-h-11 px-2 text-sm text-danger underline"
              onClick={() =>
                confirm("Hapus produk ini secara permanen?") &&
                start(async () => {
                  const r = await deleteProduct(v.id!);
                  if (r.ok) router.replace("/admin/produk");
                  else setResult({ ok: false, text: r.error });
                })
              }
            >
              Hapus produk
            </button>
          )}
          <Link href="/admin/produk" className="btn-ghost">Batal</Link>
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </div>
    </form>
  );
}
