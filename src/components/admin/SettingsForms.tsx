"use client";

import { useState, useTransition } from "react";
import { savePage, saveStoreSettings, setUserRole } from "@/actions/admin/settings";
import type { Area } from "@/lib/shipping";
import { AreaSearch } from "../account/AreaSearch";
import { Field, Notice } from "./forms";

type Opt = { value: string; label: string };
export type SettingsValue = {
  storeName: string; tagline: string; email: string; whatsappNumber: string; address: string;
  originAreaId: string; originCity: string; originPostalCode: string; originLabel: string;
  activeCouriers: string[]; paymentMethods: string[]; paymentTimeoutMins: string; freeShippingMin: string; freeShippingMax: string;
  instagramUrl: string; tiktokUrl: string; shopeeUrl: string; tokopediaUrl: string;
};

export function StoreSettingsForm({ initial, couriers, payments }: { initial: SettingsValue; couriers: Opt[]; payments: Opt[] }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const t = (k: keyof SettingsValue) => ({ id: `s-${k}`, value: v[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }), "aria-invalid": Boolean(errors[k]) });
  const toggle = (k: "activeCouriers" | "paymentMethods", val: string) => setV({ ...v, [k]: v[k].includes(val) ? v[k].filter((x) => x !== val) : [...v[k], val] });
  const area: Area | null = v.originAreaId ? { id: v.originAreaId, label: v.originLabel, province: "", city: v.originCity, district: v.originLabel, postalCode: v.originPostalCode } : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const { originLabel: _omit, ...rest } = v;
          void _omit;
          const r = await saveStoreSettings(rest);
          setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
          setMsg(r.ok ? { ok: true, text: r.message ?? "Tersimpan" } : { ok: false, text: r.error });
        });
      }}
      noValidate
    >
      <Notice result={msg} />
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold">Info toko</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama toko" htmlFor="s-storeName" error={errors.storeName}><input className="input" {...t("storeName")} /></Field>
          <Field label="Tagline" htmlFor="s-tagline"><input className="input" {...t("tagline")} /></Field>
          <Field label="Email kontak" htmlFor="s-email" error={errors.email}><input className="input" type="email" {...t("email")} /></Field>
          <Field label="Nomor WhatsApp toko" htmlFor="s-whatsappNumber" error={errors.whatsappNumber} hint="Dipakai tombol WhatsApp & notifikasi admin"><input className="input" inputMode="tel" {...t("whatsappNumber")} /></Field>
          <Field label="Alamat toko (pengirim di label)" htmlFor="s-address" className="sm:col-span-2"><textarea className="input min-h-20 py-2" {...t("address")} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold">Pengiriman</h2>
        <p className="mb-2 text-sm text-muted">Alamat asal kirim (gudang) — dipakai menghitung ongkir Biteship.</p>
        <AreaSearch value={area} onSelect={(a) => setV({ ...v, originAreaId: a.id, originCity: a.city, originPostalCode: a.postalCode, originLabel: a.label })} />
        <fieldset className="mt-5">
          <legend className="label">Kurir aktif</legend>
          {errors.activeCouriers && <p className="text-xs text-danger">{errors.activeCouriers}</p>}
          <div className="flex flex-wrap gap-x-5">
            {couriers.map((c) => (
              <label key={c.value} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-plum" checked={v.activeCouriers.includes(c.value)} onChange={() => toggle("activeCouriers", c.value)} />{c.label}</label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Gratis ongkir untuk belanja ≥ (Rp)" htmlFor="s-freeShippingMin" hint="Kosong = tidak ada"><input className="input" inputMode="numeric" {...t("freeShippingMin")} /></Field>
          <Field label="Maks. subsidi ongkir (Rp)" htmlFor="s-freeShippingMax" hint="Kosong = ongkir penuh ditanggung"><input className="input" inputMode="numeric" {...t("freeShippingMax")} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold">Pembayaran</h2>
        <fieldset>
          <legend className="label">Metode yang ditawarkan di checkout</legend>
          {errors.paymentMethods && <p className="text-xs text-danger">{errors.paymentMethods}</p>}
          <div className="flex flex-wrap gap-x-5">
            {payments.map((p) => (
              <label key={p.value} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-plum" checked={v.paymentMethods.includes(p.value)} onChange={() => toggle("paymentMethods", p.value)} />{p.label}</label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 max-w-xs">
          <Field label="Batas waktu bayar (menit)" htmlFor="s-paymentTimeoutMins" error={errors.paymentTimeoutMins} hint="1440 = 24 jam"><input className="input" inputMode="numeric" {...t("paymentTimeoutMins")} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-sans text-base font-semibold">Media sosial & marketplace</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["instagramUrl", "tiktokUrl", "shopeeUrl", "tokopediaUrl"] as const).map((k) => (
            <Field key={k} label={{ instagramUrl: "Instagram", tiktokUrl: "TikTok", shopeeUrl: "Shopee", tokopediaUrl: "Tokopedia" }[k]} htmlFor={`s-${k}`} error={errors[k]}>
              <input className="input" placeholder="https://" {...t(k)} />
            </Field>
          ))}
        </div>
      </section>
      <button disabled={pending} className="btn-primary">{pending ? "Menyimpan…" : "Simpan pengaturan"}</button>
    </form>
  );
}

export function PageEditor({ page }: { page: { slug: string; title: string; summary: string; content: string } }) {
  const [v, setV] = useState(page);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span><span className="font-medium text-ink">{page.title}</span> <span className="font-mono text-xs text-muted">/info/{page.slug}</span></span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-h-11 text-sm text-plum underline">{open ? "Tutup" : "Ubah"}</button>
      </div>
      {open && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await savePage(v);
              setMsg(r.ok ? { ok: true, text: r.message ?? "Tersimpan" } : { ok: false, text: r.error });
            });
          }}
        >
          <Notice result={msg} />
          <Field label="Judul" htmlFor={`pt-${page.slug}`}><input id={`pt-${page.slug}`} className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
          <Field label="Ringkasan" htmlFor={`ps-${page.slug}`}><input id={`ps-${page.slug}`} className="input" value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
          <Field label="Konten" htmlFor={`pc-${page.slug}`} hint="Format: ## Judul bagian · - daftar · 1. langkah · **tebal** · [teks](/tautan). Pisahkan paragraf dengan baris kosong.">
            <textarea id={`pc-${page.slug}`} className="input min-h-80 py-3 font-mono text-sm" value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} />
          </Field>
          <button disabled={pending} className="btn-primary">Simpan halaman</button>
        </form>
      )}
    </li>
  );
}

export function TeamManager({ members, meId }: { members: { id: string; name: string; email: string; role: string }[]; meId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (e: string, r: string) =>
    start(async () => {
      const res = await setUserRole({ email: e, role: r as "OWNER" });
      setMsg(res.ok ? { ok: true, text: res.message ?? "OK" } : { ok: false, text: res.error });
    });
  const LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staf Gudang" };
  return (
    <div className="space-y-4">
      <Notice result={msg} />
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span><span className="font-medium text-ink">{m.name}</span> <span className="text-muted">{m.email}</span></span>
            {m.id === meId ? (
              <span className="text-muted">{LABEL[m.role]} (Anda)</span>
            ) : (
              <span className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`r-${m.id}`}>Peran {m.name}</label>
                <select id={`r-${m.id}`} className="input min-h-10 w-auto" defaultValue={m.role} disabled={pending} onChange={(e) => run(m.email, e.target.value)}>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staf Gudang</option>
                  <option value="CUSTOMER">Cabut akses</option>
                </select>
              </span>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(email, role);
        }}
      >
        <label className="flex flex-col text-xs text-muted">Email akun<input type="email" className="input mt-1 w-64" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="flex flex-col text-xs text-muted">Peran
          <select className="input mt-1 w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STAFF">Staf Gudang</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <button disabled={pending || !email} className="btn-primary">Tambah ke tim</button>
      </form>
      <p className="text-xs text-muted">Orang tersebut harus sudah membuat akun di /daftar. Owner: semua akses. Admin: semua kecuali pengaturan. Staf Gudang: pesanan & stok.</p>
    </div>
  );
}
