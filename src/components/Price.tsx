import { discountPercent, rupiah } from "@/lib/format";

export function Price({ price, compareAt, size = "md" }: { price: number; compareAt?: number | null; size?: "md" | "lg" }) {
  const pct = discountPercent(price, compareAt);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-semibold text-ink ${size === "lg" ? "text-2xl sm:text-3xl" : "text-base"}`}>{rupiah(price)}</span>
      {pct > 0 && (
        <>
          <span className={`text-muted line-through ${size === "lg" ? "text-base" : "text-xs"}`}>
            <span className="sr-only">Harga normal </span>
            {rupiah(compareAt!)}
          </span>
          <span className={`rounded-full bg-plum-soft px-2 py-0.5 font-semibold text-plum ${size === "lg" ? "text-sm" : "text-[11px]"}`}>-{pct}%</span>
        </>
      )}
    </div>
  );
}
