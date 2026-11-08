"use client";

import { useEffect } from "react";
import { track } from "../Analytics";

/** Kirim event "purchase" sekali saat pembayaran pesanan berhasil (dicegah dobel per pesanan). */
export function PurchaseTracker({ orderNumber, total, items }: { orderNumber: string; total: number; items: { id: string; name: string; price: number; quantity: number }[] }) {
  useEffect(() => {
    const key = `zel_tracked_${orderNumber}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("purchase", { value: total, items, transactionId: orderNumber });
  }, [orderNumber, total, items]);
  return null;
}
