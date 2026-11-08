import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BannerDelete, BannerEditor, CouponDelete, CouponEditor, FlashSaleDelete, FlashSaleEditor } from "@/components/admin/PromoEditors";
import { Badge, dateTime, EmptyState, PageHeader, Skeleton, Table } from "@/components/admin/ui";
import { ProductImage } from "@/components/ProductImage";
import { requireStaff } from "@/lib/admin";
import { rupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toWibInput } from "@/lib/wib";

export const metadata: Metadata = { title: "Promo" };
const TABS = [
  ["kupon", "Kupon"],
  ["flash-sale", "Flash sale"],
  ["banner", "Banner"],
] as const;

export default function PromoAdminPage(props: PageProps<"/admin/promo">) {
  return (
    <>
      <PageHeader title="Promo" description="Kupon diskon, flash sale dengan hitung mundur, dan banner beranda." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PromoContent {...props} />
      </Suspense>
    </>
  );
}

function periodStatus(now: Date, start: Date | null, end: Date | null, active: boolean) {
  if (!active) return <Badge>Nonaktif</Badge>;
  if (start && start > now) return <Badge tone="info">Terjadwal</Badge>;
  if (end && end <= now) return <Badge tone="bad">Berakhir</Badge>;
  return <Badge tone="good">Berjalan</Badge>;
}

async function PromoContent({ searchParams }: PageProps<"/admin/promo">) {
  await requireStaff("promo");
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as string) : "kupon";
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);

  return (
    <>
      <nav className="mb-6 flex gap-2" aria-label="Jenis promo">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`btn min-h-10 border px-4 ${tab === k ? "border-plum bg-plum text-white" : "border-line bg-white text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "kupon" && <Coupons now={now} in7={in7} />}
      {tab === "flash-sale" && <FlashSales now={now} in7={in7} />}
      {tab === "banner" && <Banners now={now} />}
    </>
  );
}

async function Coupons({ now, in7 }: { now: Date; in7: Date }) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const blank = { code: "", description: "", type: "PERCENT" as const, value: "10", maxDiscount: "", minPurchase: "0", quota: "", perUserLimit: "1", startsAt: toWibInput(now), endsAt: toWibInput(in7), isActive: true };
  return (
    <>
      <div className="mb-4"><CouponEditor initial={blank} trigger="+ Kupon baru" /></div>
      {coupons.length === 0 ? (
        <EmptyState title="Belum ada kupon" />
      ) : (
        <Table label="Kupon">
          <thead><tr><th>Kode</th><th>Potongan</th><th>Syarat</th><th>Terpakai</th><th>Periode</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td><span className="font-mono font-semibold">{c.code}</span><span className="block max-w-48 truncate text-xs text-muted">{c.description}</span></td>
                <td>{c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? rupiah(c.value) : "Gratis ongkir"}{c.maxDiscount != null && <span className="block text-xs text-muted">maks. {rupiah(c.maxDiscount)}</span>}</td>
                <td className="text-xs">Min. {rupiah(c.minPurchase)}<span className="block text-muted">{c.perUserLimit}× / pembeli</span></td>
                <td className="tabular-nums">{c.usedCount}{c.quota != null && ` / ${c.quota}`}</td>
                <td className="text-xs text-muted">{dateTime.format(c.startsAt)} –<br />{dateTime.format(c.endsAt)}</td>
                <td>{periodStatus(now, c.startsAt, c.endsAt, c.isActive)}</td>
                <td className="whitespace-nowrap">
                  <CouponEditor
                    trigger="Ubah"
                    initial={{ id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: String(c.value), maxDiscount: c.maxDiscount?.toString() ?? "", minPurchase: String(c.minPurchase), quota: c.quota?.toString() ?? "", perUserLimit: String(c.perUserLimit), startsAt: toWibInput(c.startsAt), endsAt: toWibInput(c.endsAt), isActive: c.isActive }}
                  />
                  <CouponDelete id={c.id} code={c.code} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

async function FlashSales({ now, in7 }: { now: Date; in7: Date }) {
  const [sales, products] = await Promise.all([
    prisma.flashSale.findMany({ orderBy: { startsAt: "desc" }, include: { items: { include: { product: { select: { name: true, price: true } } } } } }),
    prisma.product.findMany({ where: { isPublished: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
  ]);
  return (
    <>
      <div className="mb-4">
        <FlashSaleEditor products={products} trigger="+ Flash sale baru" initial={{ name: "", startsAt: toWibInput(now), endsAt: toWibInput(in7), isActive: true, items: [] }} />
      </div>
      {sales.length === 0 ? (
        <EmptyState title="Belum ada flash sale" />
      ) : (
        <ul className="space-y-4">
          {sales.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{s.name} <span className="ml-2">{periodStatus(now, s.startsAt, s.endsAt, s.isActive)}</span></p>
                  <p className="text-xs text-muted">{dateTime.format(s.startsAt)} – {dateTime.format(s.endsAt)} WIB</p>
                </div>
                <div>
                  <FlashSaleEditor
                    products={products}
                    trigger="Ubah"
                    initial={{ id: s.id, name: s.name, startsAt: toWibInput(s.startsAt), endsAt: toWibInput(s.endsAt), isActive: s.isActive, items: s.items.map((i) => ({ productId: i.productId, salePrice: String(i.salePrice), quota: i.quota?.toString() ?? "" })) }}
                  />
                  <FlashSaleDelete id={s.id} name={s.name} />
                </div>
              </div>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {s.items.map((i) => (
                  <li key={i.id} className="flex justify-between rounded-lg bg-cream px-3 py-2">
                    <span>{i.product.name}</span>
                    <span className="tabular-nums">{rupiah(i.salePrice)} <span className="text-xs text-muted line-through">{rupiah(i.product.price)}</span> · {i.soldCount}{i.quota != null && `/${i.quota}`} terjual</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Banners({ now }: { now: Date }) {
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <div className="mb-4">
        <BannerEditor trigger="+ Banner baru" initial={{ title: "", subtitle: "", imageUrl: "", linkUrl: "/promo", ctaLabel: "Belanja Sekarang", sortOrder: String(banners.length), isActive: true, startsAt: "", endsAt: "" }} />
      </div>
      {banners.length === 0 ? (
        <EmptyState title="Belum ada banner" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <li key={b.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-[16/7] bg-blush"><ProductImage src={b.imageUrl} alt="" fill sizes="50vw" className="object-cover" /></div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium text-ink">{b.title} <span className="ml-1">{periodStatus(now, b.startsAt, b.endsAt, b.isActive)}</span></p>
                  <p className="text-xs text-muted">Urutan {b.sortOrder} · {b.linkUrl ?? "tanpa tautan"}</p>
                </div>
                <div>
                  <BannerEditor
                    trigger="Ubah"
                    initial={{ id: b.id, title: b.title, subtitle: b.subtitle ?? "", imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", ctaLabel: b.ctaLabel ?? "", sortOrder: String(b.sortOrder), isActive: b.isActive, startsAt: toWibInput(b.startsAt), endsAt: toWibInput(b.endsAt) }}
                  />
                  <BannerDelete id={b.id} title={b.title} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
