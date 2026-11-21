"use client";

import { useState, useTransition } from "react";
import { addOrderNote, adminCancelOrder, confirmPayment, markCompleted, markShipped, processOrder } from "@/actions/admin/orders";
import { rupiah } from "@/lib/format";
import { MANUAL_PAYMENT_METHODS } from "@/lib/manual-payment";
import { Notice } from "./forms";

/** manual: pesanan mode WhatsApp → admin mengonfirmasi pembayaran & ongkir sendiri. */
type ManualInfo = { amountBeforeShipping: number; couriers: { value: string; label: string }[] };
type Props = { orderId: string; status: string; trackingNumber: string | null; canCancel: boolean; manual?: ManualInfo | null };

export function OrderActions({ orderId, status, trackingNumber, canCancel, manual }: Props) {
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
      {status === "PENDING_PAYMENT" && !manual && <p className="text-sm text-muted">Menunggu pembayaran pembeli. Status berubah otomatis setelah dibayar.</p>}
      {status === "PENDING_PAYMENT" && manual && <ManualPaymentForm orderId={orderId} info={manual} pending={pending} run={run} />}
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
            {status !== "PENDING_PAYMENT" && <p className="text-xs text-danger">Pesanan sudah dibayar: stok dikembalikan, dan dana harus Anda kembalikan ke pembeli{manual ? "" : " (dashboard Midtrans)"}.</p>}
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

function ManualPaymentForm({ orderId, info, pending, run }: { orderId: string; info: ManualInfo; pending: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void }) {
  const [ongkir, setOngkir] = useState("");
  const [courier, setCourier] = useState(info.couriers[0]?.value ?? "");
  const [otherCourier, setOtherCourier] = useState("");
  const [service, setService] = useState("");
  const [method, setMethod] = useState<string>(MANUAL_PAYMENT_METHODS[0]);
  const shipping = Number(ongkir.replace(/\D/g, "")) || 0;
  const total = info.amountBeforeShipping + shipping;
  const courierCode = courier === "other" ? otherCourier.trim() : courier;

  return (
    <form
      className="space-y-3 rounded-xl border border-plum/30 bg-blush/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`Tandai pesanan sudah dibayar ${rupiah(total)}?`)) return;
        run(() => confirmPayment(orderId, { shippingCost: shipping, courierCode, courierService: service, method: method as (typeof MANUAL_PAYMENT_METHODS)[number] }));
      }}
    >
      <p className="text-sm text-ink">
        <strong>Pesanan via WhatsApp.</strong> Setelah ongkir disepakati dan pembeli membayar, konfirmasi di sini.
      </p>
      <div>
        <label htmlFor="mp-ongkir" className="label">Ongkir (Rp)</label>
        <input id="mp-ongkir" className="input tabular-nums" inputMode="numeric" value={ongkir} onChange={(e) => setOngkir(e.target.value.replace(/\D/g, ""))} placeholder="mis. 15000" required />
        <p className="mt-1 text-xs text-muted">Ongkir yang dibayar pembeli. Isi 0 jika gratis ongkir.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="mp-kurir" className="label">Kurir</label>
          <select id="mp-kurir" className="input" value={courier} onChange={(e) => setCourier(e.target.value)}>
            {info.couriers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            <option value="other">Lainnya…</option>
          </select>
        </div>
        <div>
          <label htmlFor="mp-layanan" className="label">Layanan <span className="font-normal text-muted">(opsional)</span></label>
          <input id="mp-layanan" className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="mis. REG" maxLength={40} />
        </div>
      </div>
      {courier === "other" && (
        <div>
          <label htmlFor="mp-kurir-lain" className="label">Nama kurir</label>
          <input id="mp-kurir-lain" className="input" value={otherCourier} onChange={(e) => setOtherCourier(e.target.value)} placeholder="mis. Lion Parcel, GoSend" maxLength={30} required />
        </div>
      )}
      <div>
        <label htmlFor="mp-metode" className="label">Metode pembayaran</label>
        <select id="mp-metode" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          {MANUAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <p className="flex justify-between border-t border-line pt-2 text-sm font-semibold"><span>Total dibayar</span><span className="tabular-nums">{rupiah(total)}</span></p>
      <button disabled={pending || ongkir === "" || !courierCode} className="btn-primary w-full">Konfirmasi sudah dibayar</button>
    </form>
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
