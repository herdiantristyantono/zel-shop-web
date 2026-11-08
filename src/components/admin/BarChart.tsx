"use client";

import { useId, useState } from "react";

export type BarDatum = { label: string; value: number; display: string; sublabel?: string };

const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Grafik kolom satu seri (dataviz spec): kolom ≤24px, ujung data membulat 4px & rata di baseline,
 * grid hairline, satu sumbu, tooltip hover/fokus, plus tampilan tabel. Teks memakai warna ink.
 */
export function BarChart({ data, title, valueLabel, height = 220 }: { data: BarDatum[]; title: string; valueLabel: string; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const pad = { l: 48, r: 8, t: 12, b: 28 };
  const ih = height - pad.t - pad.b;
  const iw = W - pad.l - pad.r;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const band = iw / Math.max(1, data.length);
  const bw = Math.max(2, Math.min(24, band - 2)); // ≥2px celah antar kolom
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover != null ? data[hover] : null;

  return (
    <figure className="relative">
      <figcaption className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{title}</title>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#EDE3E0" strokeWidth={1} />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6B5560">{t === 0 ? "0" : compact.format(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * band + (band - bw) / 2;
          const bh = (d.value / max) * ih;
          const y = pad.t + ih - bh;
          const r = Math.min(4, bh, bw / 2);
          const path = bh > 0 ? `M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z` : "";
          return (
            <g key={d.label}>
              {path && <path d={path} fill="#5B2A45" opacity={hover == null || hover === i ? 1 : 0.45} />}
              {/* area hit lebih besar dari kolom */}
              <rect
                x={pad.l + i * band}
                y={pad.t}
                width={band}
                height={ih}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}${d.sublabel ? ` (${d.sublabel})` : ""}: ${d.display}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
              {(data.length - 1 - i) % labelEvery === 0 && (
                <text x={pad.l + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#6B5560">{d.label}</text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#D9C9C5" strokeWidth={1} />
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((pad.l + hover * band + band / 2) / W) * 100}%` }}
          role="status"
        >
          <p className="font-medium text-ink">{h.label}{h.sublabel && <span className="text-muted"> · {h.sublabel}</span>}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-ink"><span className="h-2 w-2 rounded-sm bg-plum" aria-hidden />{valueLabel}: <strong className="tabular-nums">{h.display}</strong></p>
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="min-h-9 cursor-pointer text-muted hover:text-plum">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead><tr className="text-xs text-muted"><th className="py-1">Periode</th><th className="py-1 text-right">{valueLabel}</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line/60"><td className="py-1">{d.label}{d.sublabel && ` · ${d.sublabel}`}</td><td className="py-1 text-right tabular-nums">{d.display}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Batang horizontal (peringkat kategori). Label & nilai di luar batang, teks warna ink. */
export function HBarList({ data, valueLabel }: { data: BarDatum[]; valueLabel: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3" aria-label={valueLabel}>
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ink">{d.label}</span>
            <span className="tabular-nums text-ink">{d.display}{d.sublabel && <span className="text-muted"> · {d.sublabel}</span>}</span>
          </div>
          <div className="mt-1 h-2 rounded-r bg-transparent" aria-hidden>
            <div className="h-2 rounded-r-[4px] bg-plum" style={{ width: `${Math.max(1, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
