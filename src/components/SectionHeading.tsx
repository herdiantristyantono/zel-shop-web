import Link from "next/link";
import { ChevronRight } from "./icons";

export function SectionHeading({ eyebrow, title, href, children }: { eyebrow?: string; title: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
      </div>
      {children}
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-plum hover:underline">
          Lihat semua <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}
