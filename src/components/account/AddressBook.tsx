"use client";

import { useRef, useState, useTransition } from "react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/actions/address";
import { formatAddress } from "@/lib/format";
import { CloseIcon } from "../icons";
import { AddressFields, draftToInput, emptyAddress, type AddressDraft } from "./AddressFields";

export type SavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  areaId: string | null;
  isDefault: boolean;
};

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open(a?: SavedAddress) {
    setEditing(a?.id ?? null);
    setErrors({});
    setFormError(null);
    setDraft(
      a
        ? {
            label: a.label,
            recipientName: a.recipientName,
            phone: a.phone,
            street: a.street,
            area: a.areaId ? { id: a.areaId, label: "", province: a.province, city: a.city, district: a.district, postalCode: a.postalCode } : null,
          }
        : emptyAddress,
    );
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={() => open()} className="btn-primary">+ Tambah alamat</button>
      {addresses.length === 0 ? (
        <p className="mt-6 text-muted">Belum ada alamat tersimpan.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={`rounded-2xl border bg-white p-5 ${a.isDefault ? "border-plum" : "border-line"}`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{a.label}</span>
                {a.isDefault && <span className="rounded-full bg-plum-soft px-2 py-0.5 text-xs font-medium text-plum">Utama</span>}
              </div>
              <p className="mt-2 text-sm text-ink">{a.recipientName} · {a.phone}</p>
              <p className="mt-1 text-sm text-muted">{formatAddress(a)}</p>
              {!a.areaId && <p className="mt-2 text-xs text-danger">Pilih ulang kecamatan agar ongkir bisa dihitung.</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 text-sm">
                <button type="button" onClick={() => open(a)} className="min-h-11 text-plum underline">Ubah</button>
                {!a.isDefault && <button type="button" disabled={pending} onClick={() => start(() => setDefaultAddress(a.id))} className="min-h-11 text-plum underline">Jadikan utama</button>}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Hapus alamat "${a.label}"?`) && start(() => deleteAddress(a.id))}
                  className="min-h-11 text-muted underline hover:text-danger"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} className="m-auto w-[calc(100vw-2rem)] max-w-xl rounded-3xl bg-cream p-0 backdrop:bg-ink/40" aria-labelledby="addr-title">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveAddress({ ...draftToInput(draft), isDefault: false }, editing ?? undefined);
              if (res.ok) dialog.current?.close();
              else {
                setErrors(res.fieldErrors ?? {});
                setFormError(res.error);
              }
            });
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="addr-title" className="text-2xl">{editing ? "Ubah alamat" : "Alamat baru"}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup">
              <CloseIcon />
            </button>
          </div>
          {formError && <p role="alert" className="mb-4 rounded-xl bg-[#FBE9EC] px-4 py-3 text-sm text-danger">{formError}</p>}
          <AddressFields value={draft} onChange={setDraft} errors={errors} />
          <button type="submit" disabled={pending} className="btn-primary mt-6 h-12 w-full">{pending ? "Menyimpan…" : "Simpan alamat"}</button>
        </form>
      </dialog>
    </>
  );
}
