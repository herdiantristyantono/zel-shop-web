const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 150000 → "Rp 150.000" */
export function rupiah(value: number): string {
  return `Rp ${idr.format(Math.round(value))}`;
}

/** Persentase diskon dibulatkan, mis. 25 */
export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function gramToKg(gram: number): string {
  return gram >= 1000 ? `${(gram / 1000).toLocaleString("id-ID")} kg` : `${gram} gram`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
