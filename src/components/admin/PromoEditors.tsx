"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { deleteBanner, deleteCoupon, deleteFlashSale, saveBanner, saveCoupon, saveFlashSale } from "@/actions/admin/promo";
import { CloseIcon } from "../icons";
import { Field, Notice, Toggle } from "./forms";
import { ImageManager, type ImageItem } from "./ImageManager";

type R = { ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

function useDialogForm() {
  const ref = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<R>) =>
    start(async () => {
      const r = await fn();
      setErrors(r.fieldErrors ?? {});
      if (r.ok) ref.current?.close();
      setMsg(r.ok ? null : { ok: false, text: r.error ?? "Gagal" });
    });
  const open = () => {
    setErrors({});
    setMsg(null);
    ref.current?.showModal();
  };
  return { ref, errors, msg, pending, submit, open, start };
}

function Dialog({ dref, title, children, onSubmit, pending, msg }: { dref: React.RefObject<HTMLDialogElement | null>; title: string; children: ReactNode; onSubmit: () => void; pending: boolean; msg: { ok: boolean; text: string } | null }) {
  return (
    <dialog ref={dref} className="m-auto w-[calc(100vw-2rem)] max-w-2xl rounded-3xl bg-cream p-0 backdrop:bg-ink/40" aria-label={title}>
      <form
        className="max-h-[90dvh] overflow-y-auto p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">{title}</h2>
          <button type="button" onClick={() => dref.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup">
            <CloseIcon />
          </button>
        </div>
        <div className="mb-4"><Notice result={msg} /></div>
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dref.current?.close()} className="btn-ghost">Batal</button>
          <button disabled={pending} className="btn-primary">{pending ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteButton({ label, action }: { label: string; action: () => Promise<R> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" disabled={pending} onClick={() => confirm(`Hapus ${label}?`) && start(async () => setMsg((await action()).message ?? null))} className="min-h-11 px-1 text-sm text-danger underline">
        Hapus
      </button>
      {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
    </>
  );
}

// ───────────── Kupon ─────────────

export type CouponValue = {
  id?: string; code: string; description: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: string; maxDiscount: string; minPurchase: string;
  quota: string; perUserLimit: string; startsAt: string; endsAt: string; isActive: boolean;
};

export function CouponEditor({ initial, trigger }: { initial: CouponValue; trigger: string }) {
  const f = useDialogForm();
  const [v, setV] = useState(initial);
  const t = (k: keyof CouponValue) => ({ id: `c-${k}-${initial.id ?? "new"}`, value: v[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value }) });
  const fid = (k: string) => `c-${k}-${initial.id ?? "new"}`;
  return (
    <>
      <button type="button" onClick={() => (setV(initial), f.open())} className={initial.id ? "min-h-11 px-1 text-sm text-plum underline" : "btn-primary"}>{trigger}</button>
      <Dialog dref={f.ref} title={initial.id ? `Ubah kupon ${initial.code}` : "Kupon baru"} onSubmit={() => f.submit(() => saveCoupon(v))} pending={f.pending} msg={f.msg}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode" htmlFor={fid("code")} error={f.errors.code}><input className="input font-mono uppercase" {...t("code")} maxLength={20} /></Field>
          <Field label="Jenis" htmlFor={fid("type")}>
            <select className="input" {...t("type")}>
              <option value="PERCENT">Persen (%)</option>
              <option value="FIXED">Potongan nominal (Rp)</option>
              <option value="FREE_SHIPPING">Gratis ongkir</option>
            </select>
          </Field>
          <Field label="Deskripsi (tampil di halaman Promo)" htmlFor={fid("description")} className="sm:col-span-2"><input className="input" {...t("description")} maxLength={160} /></Field>
          {v.type !== "FREE_SHIPPING" && <Field label={v.type === "PERCENT" ? "Persen" : "Potongan (Rp)"} htmlFor={fid("value")} error={f.errors.value}><input className="input" inputMode="numeric" {...t("value")} /></Field>}
          {v.type !== "FIXED" && <Field label="Maks. potongan (Rp)" htmlFor={fid("maxDiscount")} hint="Kosong = tanpa batas"><input className="input" inputMode="numeric" {...t("maxDiscount")} /></Field>}
          <Field label="Min. belanja (Rp)" htmlFor={fid("minPurchase")}><input className="input" inputMode="numeric" {...t("minPurchase")} /></Field>
          <Field label="Kuota total" htmlFor={fid("quota")} hint="Kosong = tanpa batas"><input className="input" inputMode="numeric" {...t("quota")} /></Field>
          <Field label="Batas per pembeli" htmlFor={fid("perUserLimit")}><input className="input" inputMode="numeric" {...t("perUserLimit")} /></Field>
          <Field label="Mulai (WIB)" htmlFor={fid("startsAt")} error={f.errors.startsAt}><input type="datetime-local" className="input" {...t("startsAt")} /></Field>
          <Field label="Berakhir (WIB)" htmlFor={fid("endsAt")} error={f.errors.endsAt}><input type="datetime-local" className="input" {...t("endsAt")} /></Field>
          <Toggle id={fid("active")} label="Aktif" checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} />
        </div>
      </Dialog>
    </>
  );
}

export function CouponDelete({ id, code }: { id: string; code: string }) {
  return <DeleteButton label={`kupon ${code}`} action={() => deleteCoupon(id)} />;
}

// ───────────── Flash sale ─────────────

export type FlashValue = { id?: string; name: string; startsAt: string; endsAt: string; isActive: boolean; items: { productId: string; salePrice: string; quota: string }[] };
type ProductOpt = { id: string; name: string; price: number };

export function FlashSaleEditor({ initial, products, trigger }: { initial: FlashValue; products: ProductOpt[]; trigger: string }) {
  const f = useDialogForm();
  const [v, setV] = useState(initial);
  const [pick, setPick] = useState("");
  const fid = (k: string) => `f-${k}-${initial.id ?? "new"}`;
  const available = products.filter((p) => !v.items.some((i) => i.productId === p.id));
  return (
    <>
      <button type="button" onClick={() => (setV(initial), f.open())} className={initial.id ? "min-h-11 px-1 text-sm text-plum underline" : "btn-primary"}>{trigger}</button>
      <Dialog dref={f.ref} title={initial.id ? "Ubah flash sale" : "Flash sale baru"} onSubmit={() => f.submit(() => saveFlashSale(v))} pending={f.pending} msg={f.msg}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama" htmlFor={fid("name")} error={f.errors.name} className="sm:col-span-2"><input id={fid("name")} className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} /></Field>
          <Field label="Mulai (WIB)" htmlFor={fid("s")} error={f.errors.startsAt}><input id={fid("s")} type="datetime-local" className="input" value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} /></Field>
          <Field label="Berakhir (WIB)" htmlFor={fid("e")} error={f.errors.endsAt}><input id={fid("e")} type="datetime-local" className="input" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} /></Field>
          <Toggle id={fid("a")} label="Aktif" checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} />
        </div>
        <h3 className="mt-6 font-sans text-sm font-semibold text-ink">Produk</h3>
        <ul className="mt-2 space-y-2">
          {v.items.map((it, i) => {
            const p = products.find((x) => x.id === it.productId);
            return (
              <li key={it.productId} className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-[1fr_140px_110px_auto] sm:items-end">
                <p className="text-sm">{p?.name}<span className="block text-xs text-muted">Normal Rp {p?.price.toLocaleString("id-ID")}</span></p>
                <label className="text-xs text-muted">Harga flash<input className="input mt-1 min-h-10" inputMode="numeric" value={it.salePrice} onChange={(e) => setV({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, salePrice: e.target.value } : x)) })} /></label>
                <label className="text-xs text-muted">Kuota<input className="input mt-1 min-h-10" inputMode="numeric" placeholder="∞" value={it.quota} onChange={(e) => setV({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, quota: e.target.value } : x)) })} /></label>
                <button type="button" onClick={() => setV({ ...v, items: v.items.filter((_, j) => j !== i) })} className="min-h-10 text-sm text-danger underline">Hapus</button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor={fid("pick")}>Pilih produk</label>
          <select id={fid("pick")} className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pilih produk…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            type="button"
            disabled={!pick}
            className="btn-outline shrink-0"
            onClick={() => {
              const p = products.find((x) => x.id === pick)!;
              setV({ ...v, items: [...v.items, { productId: p.id, salePrice: String(Math.round((p.price * 0.85) / 1000) * 1000), quota: "" }] });
              setPick("");
            }}
          >
            Tambah
          </button>
        </div>
      </Dialog>
    </>
  );
}

export function FlashSaleDelete({ id, name }: { id: string; name: string }) {
  return <DeleteButton label={`flash sale "${name}"`} action={() => deleteFlashSale(id)} />;
}

// ───────────── Banner ─────────────

export type BannerValue = { id?: string; title: string; subtitle: string; imageUrl: string; linkUrl: string; ctaLabel: string; sortOrder: string; isActive: boolean; startsAt: string; endsAt: string };

export function BannerEditor({ initial, trigger }: { initial: BannerValue; trigger: string }) {
  const f = useDialogForm();
  const [v, setV] = useState(initial);
  const [imgs, setImgs] = useState<ImageItem[]>(initial.imageUrl ? [{ key: "b", url: initial.imageUrl, alt: "", variantRef: null }] : []);
  const t = (k: keyof BannerValue) => ({ id: `b-${k}-${initial.id ?? "new"}`, value: v[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }) });
  const fid = (k: string) => `b-${k}-${initial.id ?? "new"}`;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setV(initial);
          setImgs(initial.imageUrl ? [{ key: "b", url: initial.imageUrl, alt: "", variantRef: null }] : []);
          f.open();
        }}
        className={initial.id ? "min-h-11 px-1 text-sm text-plum underline" : "btn-primary"}
      >
        {trigger}
      </button>
      <Dialog dref={f.ref} title={initial.id ? "Ubah banner" : "Banner baru"} onSubmit={() => f.submit(() => saveBanner({ ...v, imageUrl: imgs.at(-1)?.url ?? "" }))} pending={f.pending} msg={f.msg}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul" htmlFor={fid("title")} error={f.errors.title} className="sm:col-span-2"><input className="input" {...t("title")} maxLength={80} /></Field>
          <Field label="Subjudul" htmlFor={fid("subtitle")} className="sm:col-span-2"><input className="input" {...t("subtitle")} maxLength={160} /></Field>
          <Field label="Tautan" htmlFor={fid("linkUrl")} error={f.errors.linkUrl} hint="mis. /promo atau /kategori/tote-bag"><input className="input" {...t("linkUrl")} /></Field>
          <Field label="Teks tombol" htmlFor={fid("ctaLabel")}><input className="input" {...t("ctaLabel")} maxLength={30} /></Field>
          <Field label="Mulai tayang (WIB, opsional)" htmlFor={fid("startsAt")}><input type="datetime-local" className="input" {...t("startsAt")} /></Field>
          <Field label="Selesai tayang (WIB, opsional)" htmlFor={fid("endsAt")}><input type="datetime-local" className="input" {...t("endsAt")} /></Field>
          <Field label="Urutan" htmlFor={fid("sortOrder")}><input className="input" inputMode="numeric" {...t("sortOrder")} /></Field>
          <Toggle id={fid("active")} label="Aktif" checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} />
        </div>
        <p className="mb-2 mt-6 text-sm font-medium text-ink">Gambar (rasio lebar 16:7, mis. 1600 × 700 px)</p>
        {f.errors.imageUrl && <p className="mb-2 text-xs text-danger">{f.errors.imageUrl}</p>}
        <ImageManager images={imgs.slice(-1)} onChange={(n) => setImgs((p) => (typeof n === "function" ? n(p) : n))} folder="banners" />
      </Dialog>
    </>
  );
}

export function BannerDelete({ id, title }: { id: string; title: string }) {
  return <DeleteButton label={`banner "${title}"`} action={() => deleteBanner(id)} />;
}
