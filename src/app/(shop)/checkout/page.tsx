import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { getCart, getCartOwner } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, getStoreSettings } from "@/lib/settings";
import { isMockShipping } from "@/lib/shipping";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="mb-8 text-4xl sm:text-5xl">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-blush" />}>
        <CheckoutLoader />
      </Suspense>
    </div>
  );
}

async function CheckoutLoader() {
  const [{ lines, summary }, { session }, settings] = await Promise.all([getCart(), getCartOwner(), getStoreSettings()]);
  if (!lines.length || summary.hasIssues) redirect("/keranjang");
  const addresses = session ? await prisma.address.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : [];
  return (
    <CheckoutFlow
      lines={lines}
      subtotal={summary.subtotal}
      user={session ? { name: session.user.name, email: session.user.email } : null}
      addresses={addresses}
      paymentMethods={settings.paymentMethods.filter((m) => PAYMENT_METHODS[m]).map((m) => ({ value: m, ...PAYMENT_METHODS[m] }))}
      mockShipping={isMockShipping()}
    />
  );
}
