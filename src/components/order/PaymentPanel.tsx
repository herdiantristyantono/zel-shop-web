"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cancelMyOrder, confirmReceived, simulatePayment, startPayment, syncPayment } from "@/actions/order";

type Props = { orderNumber: string; token: string | null; mode: "midtrans" | "dev" | "manual" | "whatsapp"; whatsappHref: string };

export function PaymentPanel({ orderNumber, token, mode, whatsappHref }: Props) {
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const synced = useRef(false);
  const ref = { orderNumber, token };

  // Kembali dari halaman Midtrans (?transaction_status=...) → cek status sekali
  useEffect(() => {
    if (mode !== "midtrans" || synced.current || !sp.get("transaction_status")) return;
    synced.current = true;
    start(async () => {
      const r = await syncPayment(ref);
      if (r.ok && r.message) setMsg({ ok: true, text: r.message });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sp]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; url?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.url) return void window.location.assign(r.url);
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error ?? "Gagal" });
    });

  return (
    <div className="mt-5 space-y-3">
      {mode === "midtrans" && (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => startPayment(ref))} className="btn-primary h-12 w-full sm:w-auto">
            {pending ? "Memproses…" : "Bayar sekarang"}
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => syncPayment(ref))} className="btn-ghost w-full sm:ml-2 sm:w-auto">
            Saya sudah bayar — cek status
          </button>
        </>
      )}
      {mode === "dev" && (
        <div className="rounded-xl border border-dashed border-plum/40 bg-blush p-4 text-sm">
          <p className="text-ink"><strong>Mode pengembangan:</strong> kunci Midtrans belum diisi. Simulasikan pembayaran berhasil untuk menguji alur.</p>
          <button type="button" disabled={pending} onClick={() => run(() => simulatePayment(ref))} className="btn-primary mt-3">Simulasikan pembayaran berhasil</button>
        </div>
      )}
      {mode === "manual" && (
        <div className="rounded-xl bg-blush p-4 text-sm text-ink">
          Pembayaran online sedang tidak tersedia. Hubungi admin kami untuk menyelesaikan pembayaran.
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full sm:w-auto">Hubungi via WhatsApp</a>
        </div>
      )}
      {mode === "whatsapp" && (
        <div>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary h-12 w-full sm:w-auto">Konfirmasi via WhatsApp</a>
        </div>
      )}
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-plum" : "text-danger"}`}>{msg.text}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Batalkan pesanan ini? Stok akan dikembalikan.") && run(() => cancelMyOrder(ref))}
        className="min-h-11 text-sm text-muted underline underline-offset-2 hover:text-danger"
      >
        Batalkan pesanan
      </button>
    </div>
  );
}

export function ConfirmReceivedButton({ orderNumber, token }: { orderNumber: string; token: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn-primary"
        onClick={() =>
          confirm("Pastikan paket sudah Anda terima dalam kondisi baik.") &&
          start(async () => {
            const r = await confirmReceived({ orderNumber, token });
            if (!r.ok) setError(r.error);
          })
        }
      >
        Pesanan sudah diterima
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
