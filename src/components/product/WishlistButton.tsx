"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleWishlist } from "@/actions/wishlist";
import { HeartIcon } from "../icons";

export function WishlistButton({ productId, className = "" }: { productId: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    fetch("/api/me/wishlist")
      .then((r) => r.json())
      .then((d: { ids: string[] }) => live && setSaved(d.ids.includes(productId)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [productId]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleWishlist(productId);
          if (res.ok) setSaved(res.saved);
          else if (res.needLogin) router.push(`/masuk?next=${encodeURIComponent(pathname)}`);
        })
      }
      aria-pressed={saved}
      aria-label={saved ? "Hapus dari wishlist" : "Simpan ke wishlist"}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-white text-plum hover:bg-blush disabled:opacity-60 ${className}`}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}
