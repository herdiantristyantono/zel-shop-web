"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(end - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (left === null) return <span className="inline-block h-9" aria-hidden />;
  if (left <= 0) return <span className="text-sm font-medium text-plum">Flash sale berakhir</span>;
  const { h, m, s } = parts(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1.5" role="timer" aria-label={`Berakhir dalam ${h} jam ${m} menit`}>
      {!compact && <span className="mr-1 text-sm text-ink">Berakhir dalam</span>}
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5" aria-hidden>
          <span className="min-w-9 rounded-lg bg-plum px-2 py-1.5 text-center font-semibold tabular-nums text-white">{v}</span>
          {i < 2 && <span className="font-semibold text-plum">:</span>}
        </span>
      ))}
    </span>
  );
}
