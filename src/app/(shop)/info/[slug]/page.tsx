import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { getPage, getPageSlugs } from "@/lib/catalog";

export async function generateStaticParams() {
  const pages = await getPageSlugs();
  return pages.length ? pages.map((p) => ({ slug: p.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/info/[slug]">): Promise<Metadata> {
  const page = await getPage((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.summary ?? undefined, alternates: { canonical: `/info/${page.slug}` } };
}

export default async function InfoPage({ params }: PageProps<"/info/[slug]">) {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow mb-3">Informasi</p>
      <h1 className="text-4xl sm:text-5xl">{page.title}</h1>
      {page.summary && <p className="mt-4 text-lg text-muted">{page.summary}</p>}
      <div className="mt-8 border-t border-line pt-4">
        <Markdown source={page.content} />
      </div>
    </article>
  );
}
