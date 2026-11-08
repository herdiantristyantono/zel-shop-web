"use client";

import { useState, useTransition } from "react";
import { replyReview, setReviewStatus } from "@/actions/admin/reviews";

export function ReviewModeration({ id, status, reply }: { id: string; status: string; reply: string | null }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState(reply ?? "");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ?? null) : (r.error ?? "Gagal"));
    });
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" && <button type="button" disabled={pending} onClick={() => run(() => setReviewStatus(id, "APPROVED"))} className="btn-primary min-h-10 px-4">Setujui</button>}
        {status !== "HIDDEN" && <button type="button" disabled={pending} onClick={() => run(() => setReviewStatus(id, "HIDDEN"))} className="btn-outline min-h-10 px-4">Sembunyikan</button>}
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn-ghost min-h-10 px-4">{reply ? "Ubah balasan" : "Balas"}</button>
      </div>
      {open && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => replyReview(id, text));
          }}
        >
          <label htmlFor={`reply-${id}`} className="sr-only">Balasan untuk ulasan</label>
          <textarea id={`reply-${id}`} className="input min-h-20 py-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Terima kasih atas ulasannya…" />
          <button disabled={pending} className="btn-primary min-h-10 px-4">Simpan balasan</button>
        </form>
      )}
      {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
    </div>
  );
}
