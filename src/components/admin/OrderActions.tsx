"use client";

import { useState, useTransition } from "react";
import { addOrderNote, adminCancelOrder, markCompleted, markShipped, processOrder } from "@/actions/admin/orders";
import { Notice } from "./forms";

type Props = { orderId: string; status: string; trackingNumber: string | null; canCancel: boolean };

export function OrderActions({ orderId, status, trackingNumber, canCancel }: Props) {
  const [resi, setResi] = useState(trackingNumber ?? "");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Berhasil" } : { ok: false, text: r.error ?? "Gagal" });
    });

  const canShip = status === "PAID" || status === "PROCESSING" || status === "SHIPPED";
  const cancellable = canCancel && ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(status);

  return (
    <div className="space-y-4">
      <Notice result={msg} />
      {status === "PENDING_PAYMENT" && <p className="text-sm text-muted">Menunggu pembayaran pembeli. Status berubah otomatis setelah dibayar.</p>}
      {status === "PAID" && (
        <button type="button" disabled={pending} onClick={() => run(() => processOrder(orderId))} className="btn-primary w-full">
          Proses pesanan (mulai kemas)
        </button>
      )}
      {canShip && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => markShipped(orderId, resi));
          }}
        >
          <label htmlFor="resi" className="label">{status === "SHIPPED" ? "Perbarui nomor resi" : "Nomor resi"}</label>
          <div className="flex gap-2">
            <input id="resi" className="input font-mono uppercase" value={resi} onChange={(e) => setResi(e.target.value.toUpperCase())} placeholder="mis. JNE0012345678" maxLength={40} required />
            <button disabled={pending || !resi.trim()} className="btn-primary shrink-0">{status === "SHIPPED" ? "Simpan" : "Kirim"}</button>
          </div>
          <p className="text-xs text-muted">Pembeli otomatis menerima email & WhatsApp berisi resi.</p>
        </form>
      )}
      {status === "SHIPPED" && (
        <button type="button" disabled={pending} onClick={() => run(() => markCompleted(orderId))} className="btn-outline w-full">
          Tandai selesai
        </button>
      )}
      {cancellable &&
        (showCancel ? (
          <form
            className="space-y-2 rounded-xl border border-danger/30 bg-[#FBE9EC]/40 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => adminCancelOrder(orderId, reason));
            }}
          >
            <label htmlFor="reason" className="label">Alasan pembatalan</label>
            <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. Stok rusak, pembeli minta batal" maxLength={200} required />
            {status !== "PENDING_PAYMENT" && <p className="text-xs text-danger">Pesanan sudah dibayar: stok dikembalikan, dan dana harus Anda refund ke pembeli (dashboard Midtrans).</p>}
            <div className="flex gap-2">
              <button disabled={pending} className="btn bg-danger text-white hover:bg-danger/90">Batalkan pesanan</button>
              <button type="button" onClick={() => setShowCancel(false)} className="btn-ghost">Tutup</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setShowCancel(true)} className="min-h-11 text-sm text-danger underline">
            Batalkan pesanan…
          </button>
        ))}
    </div>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addOrderNote(orderId, body);
          if (r.ok) setBody("");
          setErr(r.ok ? null : r.error);
        });
      }}
    >
      <label htmlFor="note" className="sr-only">Catatan internal</label>
      <textarea id="note" className="input min-h-20 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Catatan internal (tidak terlihat pembeli)" />
      {err && <p className="text-xs text-danger">{err}</p>}
      <button disabled={pending || !body.trim()} className="btn-outline min-h-10 px-4">Tambah catatan</button>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary print:hidden">
      Cetak / Simpan PDF
    </button>
  );
}
