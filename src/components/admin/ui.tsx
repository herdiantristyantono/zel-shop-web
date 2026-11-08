import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-flex min-h-9 items-center text-sm text-muted hover:text-plum">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = "", id }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-cream text-ink ring-line",
  plum: "bg-plum-soft text-plum ring-plum/20",
  good: "bg-[#E6F2EA] text-[#245A3B] ring-[#245A3B]/20",
  warn: "bg-[#FBF0DC] text-[#7A4A06] ring-[#7A4A06]/20",
  info: "bg-[#E5EEF8] text-[#1F4E7A] ring-[#1F4E7A]/20",
  bad: "bg-[#FBE9EC] text-danger ring-danger/20",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

export const ORDER_TONE: Record<string, Tone> = {
  PENDING_PAYMENT: "warn",
  PAID: "plum",
  PROCESSING: "info",
  SHIPPED: "info",
  COMPLETED: "good",
  CANCELLED: "bad",
};

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Tabel responsif: bergulir horizontal di layar kecil. */
export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[640px] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted [&_thead]:border-b [&_thead]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line/70 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Halaman">
      <span className="text-muted">Halaman {page} dari {pageCount}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="btn-outline min-h-10 px-4">Sebelumnya</Link>}
        {page < pageCount && <Link href={href(page + 1)} className="btn-outline min-h-10 px-4">Berikutnya</Link>}
      </div>
    </nav>
  );
}

export function Skeleton({ className = "h-64" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-blush ${className}`} aria-busy />;
}

export const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export const dateOnly = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
