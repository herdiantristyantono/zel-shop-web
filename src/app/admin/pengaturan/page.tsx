import type { Metadata } from "next";
import { Suspense } from "react";
import { PageEditor, StoreSettingsForm, TeamManager } from "@/components/admin/SettingsForms";
import { Card, PageHeader, Skeleton } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin";
import { isWhatsAppCheckout } from "@/lib/checkout-mode";
import { isWhatsAppPageSlug, whatsappPageDefaults, whatsappPageSlug } from "@/lib/pages-whatsapp";
import { prisma } from "@/lib/prisma";
import { getStoreSettings, PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan toko" description="Hanya Owner yang dapat mengubah halaman ini." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const me = await requireStaff("settings");
  const [s, pages, team] = await Promise.all([
    getStoreSettings(),
    prisma.page.findMany({ orderBy: { slug: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["OWNER", "ADMIN", "STAFF"] } }, orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, email: true, role: true } }),
  ]);
  const str = (n: number | null) => (n == null ? "" : String(n));
  // Mode WhatsApp: halaman yang punya versi WhatsApp diedit sebagai versi itu (disimpan ke slug `<slug>--whatsapp`).
  const whatsappMode = isWhatsAppCheckout();
  const editable = pages
    .filter((p) => !isWhatsAppPageSlug(p.slug))
    .map((p) => {
      const base = { slug: p.slug, title: p.title, summary: p.summary ?? "", content: p.content };
      if (!whatsappMode || !whatsappPageDefaults[p.slug]) return { page: base, whatsapp: false };
      const edited = pages.find((x) => x.slug === whatsappPageSlug(p.slug));
      const src = edited ? { title: edited.title, summary: edited.summary ?? "", content: edited.content } : whatsappPageDefaults[p.slug];
      return { page: { slug: whatsappPageSlug(p.slug), ...src }, whatsapp: true };
    });
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
      <StoreSettingsForm
        whatsappMode={isWhatsAppCheckout()}
        couriers={Object.entries(COURIER_NAMES).map(([value, label]) => ({ value, label }))}
        payments={Object.entries(PAYMENT_METHODS).map(([value, m]) => ({ value, label: m.label }))}
        initial={{
          storeName: s.storeName, tagline: s.tagline ?? "", email: s.email ?? "", whatsappNumber: s.whatsappNumber ?? "", address: s.address ?? "",
          originAreaId: s.originAreaId ?? "", originCity: s.originCity ?? "", originPostalCode: s.originPostalCode ?? "", originLabel: [s.originCity, s.originPostalCode].filter(Boolean).join(" "),
          activeCouriers: s.activeCouriers, paymentMethods: s.paymentMethods, paymentTimeoutMins: String(s.paymentTimeoutMins),
          freeShippingMin: str(s.freeShippingMin), freeShippingMax: str(s.freeShippingMax),
          instagramUrl: s.instagramUrl ?? "", tiktokUrl: s.tiktokUrl ?? "", shopeeUrl: s.shopeeUrl ?? "", tokopediaUrl: s.tokopediaUrl ?? "",
        }}
      />
      <div className="space-y-6">
        <Card title="Tim admin">
          <TeamManager members={team} meId={me.id} />
        </Card>
        <Card title="Halaman informasi & kebijakan">
          <ul className="space-y-2">
            {editable.map(({ page, whatsapp }) => <PageEditor key={page.slug} page={page} whatsappVersion={whatsapp} />)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
