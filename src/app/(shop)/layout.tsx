import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-white">
        Lewati ke konten
      </a>
      <Header />
      <main id="konten">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
