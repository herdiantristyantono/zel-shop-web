export const site = {
  name: "Zel Shop",
  tagline: "Dompet & Tas Wanita",
  description:
    "Zel Shop — dompet dan tas wanita yang elegan, feminin, dan modern. Bahan berkualitas, harga bersahabat, kirim ke seluruh Indonesia.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6281234567890",
  social: {
    instagram: "https://instagram.com/zelshop.id",
    tiktok: "https://tiktok.com/@zelshop.id",
    shopee: "https://shopee.co.id/zelshop.id",
    tokopedia: "https://tokopedia.com/zelshop",
  },
};

export function whatsappLink(message: string, number = site.whatsapp) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const sizeLabel: Record<string, string> = {
  MINI: "Mini",
  SMALL: "Kecil",
  MEDIUM: "Sedang",
  LARGE: "Besar",
};
