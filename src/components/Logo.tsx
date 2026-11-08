import Link from "next/link";

export function LogoMark({ className = "h-9 w-9", light = false }: { className?: string; light?: boolean }) {
  const body = light ? "#F4E4E1" : "#5B2A45";
  const z = light ? "#5B2A45" : "#F4E4E1";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M14 14v-3a6 6 0 0 1 12 0v3" fill="none" stroke={body} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 14h22l2.6 20a2 2 0 0 1-2 2.3H8.4a2 2 0 0 1-2-2.3z" fill={body} />
      <circle cx="20" cy="18.5" r="1.3" fill="#C9A06A" />
      <path d="M15.5 22h9l-9 9h9" fill="none" stroke={z} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Zel Shop — Beranda">
      <LogoMark light={light} className="h-8 w-8 sm:h-9 sm:w-9" />
      <span className="whitespace-nowrap leading-none">
        <span className={`block font-serif text-xl font-semibold tracking-[0.18em] sm:text-2xl sm:tracking-[0.22em] ${light ? "text-blush" : "text-plum"}`}>ZEL SHOP</span>
        <span className={`hidden text-[10px] font-medium tracking-[0.3em] sm:block ${light ? "text-blush/90" : "text-muted"}`}>DOMPET &amp; TAS WANITA</span>
      </span>
    </Link>
  );
}
