import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import { AccountLink } from "./AccountLink";
import { BagIcon, HeartIcon } from "./icons";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

export async function Header() {
  const categories = await getCategories();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <div className="bg-plum px-4 py-2 text-center text-xs tracking-wide text-white">
        Gratis ongkir min. belanja Rp 300.000 · Kode <strong>ZELBARU</strong> diskon 10% pembelian pertama
      </div>
      <div className="container-page flex h-16 items-center gap-2 lg:h-20 lg:gap-6">
        <MobileMenu categories={categories} />
        <div className="flex-1 lg:flex-none">
          <Logo />
        </div>
        <div className="hidden max-w-md flex-1 lg:block">
          <SearchBox />
        </div>
        <nav className="ml-auto flex items-center" aria-label="Akun & belanja">
          <AccountLink />
          <Link href="/wishlist" className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-blush sm:flex" aria-label="Wishlist">
            <HeartIcon />
          </Link>
          <Link href="/keranjang" className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Keranjang belanja">
            <BagIcon />
          </Link>
        </nav>
      </div>
      <nav className="hidden border-t border-line lg:block" aria-label="Kategori">
        <ul className="container-page flex h-12 items-center justify-center gap-8 text-sm">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/kategori/${c.slug}`} className="py-3 text-ink hover:text-plum">
                {c.name.replace(" & Card Holder", "").replace(" / Handbag", "")}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/promo" className="py-3 font-semibold text-plum">Promo</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
