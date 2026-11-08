"use client";

import type { Area } from "@/lib/shipping";
import { AreaSearch } from "./AreaSearch";

export type AddressDraft = {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  area: Area | null;
};

export const emptyAddress: AddressDraft = { label: "Rumah", recipientName: "", phone: "", street: "", area: null };

export function draftToInput(d: AddressDraft) {
  return {
    label: d.label,
    recipientName: d.recipientName,
    phone: d.phone,
    street: d.street,
    areaId: d.area?.id ?? "",
    province: d.area?.province ?? "",
    city: d.area?.city ?? "",
    district: d.area?.district ?? "",
    postalCode: d.area?.postalCode ?? "",
  };
}

/** Field alamat yang dipakai bersama buku alamat & checkout. */
export function AddressFields({ value, onChange, errors = {}, showLabel = true }: { value: AddressDraft; onChange: (v: AddressDraft) => void; errors?: Record<string, string>; showLabel?: boolean }) {
  const set = (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showLabel && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="addr-label">Label alamat</label>
          <input id="addr-label" className="input" value={value.label} onChange={set("label")} maxLength={30} placeholder="Rumah, Kantor, Kos…" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="addr-name">Nama penerima</label>
        <input id="addr-name" className="input" value={value.recipientName} onChange={set("recipientName")} autoComplete="name" required aria-invalid={Boolean(errors.recipientName)} />
        {errors.recipientName && <p className="mt-1 text-sm text-danger">{errors.recipientName}</p>}
      </div>
      <div>
        <label className="label" htmlFor="addr-phone">No. HP / WhatsApp</label>
        <input id="addr-phone" className="input" type="tel" inputMode="tel" value={value.phone} onChange={set("phone")} autoComplete="tel" placeholder="081234567890" required aria-invalid={Boolean(errors.phone)} />
        {errors.phone && <p className="mt-1 text-sm text-danger">{errors.phone}</p>}
      </div>
      <div className="sm:col-span-2">
        <AreaSearch value={value.area} onSelect={(area) => onChange({ ...value, area })} error={errors.areaId} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="addr-street">Alamat lengkap</label>
        <textarea
          id="addr-street"
          className="input min-h-24 py-3"
          value={value.street}
          onChange={set("street")}
          autoComplete="street-address"
          placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, patokan"
          maxLength={250}
          required
          aria-invalid={Boolean(errors.street)}
        />
        {errors.street && <p className="mt-1 text-sm text-danger">{errors.street}</p>}
      </div>
    </div>
  );
}
