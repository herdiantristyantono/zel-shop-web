import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renderer Markdown minimal (judul ##, daftar -, 1., **tebal**, [tautan](url), paragraf).
 * Membuat elemen React langsung — tidak ada HTML mentah sehingga aman dari XSS.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);
  return (
    <div className="prose-zel">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (block.startsWith("## ")) {
          const [head, ...rest] = lines;
          return (
            <div key={i}>
              <h2>{inline(head.slice(3))}</h2>
              {rest.length > 0 && <Markdown source={rest.join("\n")} />}
            </div>
          );
        }
        if (lines.every((l) => /^- /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>);
    else {
      const href = m[3];
      const safe = href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:");
      out.push(
        safe ? (
          href.startsWith("/") ? <Link key={m.index} href={href}>{m[2]}</Link> : <a key={m.index} href={href} rel="noopener noreferrer">{m[2]}</a>
        ) : (
          m[2]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
