import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";

export async function getStoreSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const s = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return (
    s ?? {
      id: 1,
      storeName: "Zel Shop",
      tagline: null,
      email: null,
      whatsappNumber: null,
      address: null,
      originAreaId: null,
      originCity: null,
      originPostalCode: null,
      activeCouriers: ["jne", "jnt", "sicepat", "anteraja", "pos"],
      paymentMethods: ["qris", "bank_transfer", "gopay", "shopeepay", "credit_card"],
      paymentTimeoutMins: 1440,
      freeShippingMin: null,
      freeShippingMax: null,
      instagramUrl: null,
      tiktokUrl: null,
      shopeeUrl: null,
      tokopediaUrl: null,
      updatedAt: new Date(0),
    }
  );
}

export const PAYMENT_METHODS: Record<string, { label: string; hint: string }> = {
  qris: { label: "QRIS", hint: "Scan dengan aplikasi bank atau e-wallet apa pun" },
  bank_transfer: { label: "Virtual Account", hint: "BCA, BNI, BRI, Mandiri, Permata" },
  gopay: { label: "GoPay", hint: "Bayar lewat aplikasi Gojek / GoPay" },
  shopeepay: { label: "ShopeePay", hint: "Bayar lewat aplikasi Shopee" },
  other_qris: { label: "OVO / DANA / LinkAja", hint: "Lewat QRIS di aplikasi Anda" },
  credit_card: { label: "Kartu Kredit/Debit", hint: "Visa, Mastercard, JCB" },
};
