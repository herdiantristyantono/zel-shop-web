/** Aturan harga tunggal untuk keranjang & checkout (catalog.ts memakai aturan yang sama untuk tampilan). */
export type PricingInput = {
  price: number;
  priceOverride?: number | null;
  flash?: { salePrice: number; quota: number | null; soldCount: number } | null;
};

export function flashAvailable(f: PricingInput["flash"]): f is NonNullable<PricingInput["flash"]> {
  return Boolean(f && (f.quota == null || f.soldCount < f.quota));
}

export function unitPrice({ price, priceOverride, flash }: PricingInput) {
  if (flashAvailable(flash)) return flash.salePrice;
  return priceOverride ?? price;
}

export const activeFlashWhere = () => {
  const now = new Date();
  return { flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } } };
};
