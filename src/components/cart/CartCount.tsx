import Link from "next/link";
import { getCart } from "@/lib/cart";
import { BagIcon } from "../icons";

export function CartLinkShell({ count = 0 }: { count?: number }) {
  return (
    <Link href="/keranjang" className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label={`Keranjang belanja${count ? `, ${count} item` : ""}`}>
      <BagIcon />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-plum px-1 text-[11px] font-semibold text-white" aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export async function CartCount() {
  const { summary } = await getCart();
  return <CartLinkShell count={summary.count} />;
}
