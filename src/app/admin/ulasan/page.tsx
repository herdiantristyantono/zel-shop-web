import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { Badge, dateTime, EmptyState, PageHeader, Pagination, Skeleton } from "@/components/admin/ui";
import { Stars } from "@/components/Stars";
import type { ReviewStatus } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ulasan" };
const PER = 20;
const TABS: [ReviewStatus, string][] = [
  ["PENDING", "Menunggu"],
  ["APPROVED", "Disetujui"],
  ["HIDDEN", "Disembunyikan"],
];

export default function ReviewsAdminPage(props: PageProps<"/admin/ulasan">) {
  return (
    <>
      <PageHeader title="Ulasan" description="Hanya pembeli terverifikasi (pesanan selesai) yang bisa mengulas. Ulasan tampil di toko setelah disetujui." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Reviews {...props} />
      </Suspense>
    </>
  );
}

async function Reviews({ searchParams }: PageProps<"/admin/ulasan">) {
  await requireStaff("reviews");
  const sp = await searchParams;
  const status = TABS.some(([k]) => k === sp.status) ? (sp.status as ReviewStatus) : "PENDING";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total, counts] = await Promise.all([
    prisma.review.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      include: { product: { select: { name: true, slug: true } }, user: { select: { name: true, email: true } }, orderItem: { select: { colorName: true, order: { select: { id: true, orderNumber: true } } } }, images: true },
    }),
    prisma.review.count({ where: { status } }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Status ulasan">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?status=${k}`} aria-current={status === k ? "page" : undefined} className={`btn min-h-10 border px-4 ${status === k ? "border-plum bg-plum text-white" : "border-line bg-white text-ink"}`}>
            {label} <span className="tabular-nums opacity-80">{count(k)}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada ulasan di sini" />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                <Link href={`/produk/${r.product.slug}`} target="_blank" className="font-medium text-ink underline">{r.product.name}</Link>
                <span className="text-sm text-muted">· {r.orderItem.colorName}</span>
                <Badge tone="plum">Pembeli terverifikasi</Badge>
              </div>
              {r.body ? <p className="mt-2 whitespace-pre-line text-ink">{r.body}</p> : <p className="mt-2 text-sm italic text-muted">(tanpa teks)</p>}
              <p className="mt-2 text-xs text-muted">
                {r.user.name} ({r.user.email}) · {dateTime.format(r.createdAt)} ·{" "}
                <Link href={`/admin/pesanan/${r.orderItem.order.id}`} className="font-mono underline">{r.orderItem.order.orderNumber}</Link>
              </p>
              {r.adminReply && <p className="mt-3 rounded-lg bg-blush p-3 text-sm"><strong className="text-plum">Balasan Zel Shop:</strong> {r.adminReply}</p>}
              <ReviewModeration id={r.id} status={r.status} reply={r.adminReply} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER)} href={(p) => `?status=${status}&page=${p}`} />
    </>
  );
}
