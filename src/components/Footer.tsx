import { cacheLife } from "next/cache";
import Link from "next/link";
import { isWhatsAppCheckout } from "@/lib/checkout-mode";
import { getStorefront } from "@/lib/settings";
import { site } from "@/lib/site";
import { InstagramIcon, TiktokIcon } from "./icons";
import { Logo } from "./Logo";

const groups = [
  {
    title: "Belanja",
    links: [
      ["Semua Produk", "/produk"],
      ["Produk Terbaru", "/produk?sort=terbaru"],
      ["Terlaris", "/produk?sort=terlaris"],
      ["Promo", "/promo"],
    ],
  },
  {
    title: "Bantuan",
    links: [
      ["Cara Belanja", "/info/cara-belanja"],
      ["Pengembalian & Refund", "/info/kebijakan-pengembalian"],
      ["FAQ", "/info/faq"],
      ["Kontak", "/info/kontak"],
    ],
  },
  {
    title: "Zel Shop",
    links: [
      ["Tentang Kami", "/info/tentang-kami"],
      ["Syarat & Ketentuan", "/info/syarat-ketentuan"],
      ["Kebijakan Privasi", "/info/kebijakan-privasi"],
    ],
  },
];

export async function Footer() {
  const { social } = await getStorefront();
  return (
    <footer className="mt-20 bg-plum text-blush">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-blush/90">{site.description}</p>
          <div className="flex gap-2">
            <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-blush/30 hover:bg-white/10" aria-label="Instagram Zel Shop">
              <InstagramIcon size={20} />
            </a>
            <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-blush/30 hover:bg-white/10" aria-label="TikTok Zel Shop">
              <TiktokIcon size={20} />
            </a>
            <a href={social.shopee} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center rounded-full border border-blush/30 px-4 text-xs hover:bg-white/10">Shopee</a>
            <a href={social.tokopedia} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center rounded-full border border-blush/30 px-4 text-xs hover:bg-white/10">Tokopedia</a>
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-blush">{g.title}</h2>
            <ul className="mt-4 space-y-1">
              {g.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-9 items-center text-sm text-blush/90 hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-blush/20">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-blush/80 sm:flex-row sm:justify-between">
          <p>© <Year /> Zel Shop. Semua hak dilindungi.</p>
          <p>
            {isWhatsAppCheckout()
              ? "Pembayaran: Transfer bank · QRIS · E-wallet — dikonfirmasi admin via WhatsApp"
              : "Pembayaran aman: QRIS · Virtual Account · GoPay · OVO · DANA · ShopeePay · Kartu Kredit"}
          </p>
        </div>
      </div>
    </footer>
  );
}

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
