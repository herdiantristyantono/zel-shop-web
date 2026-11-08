"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LogoMark } from "../Logo";
import { CloseIcon, MenuIcon } from "../icons";

export type NavItem = { href: string; label: string };

export function AdminNav({ items, user }: { items: NavItem[]; user: { name: string; roleLabel: string } }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.close(), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const list = (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-xl px-3 text-sm ${isActive(i.href) ? "bg-plum text-white" : "text-ink hover:bg-blush"}`}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
  const footer = (
    <div className="border-t border-line p-4 text-sm">
      <p className="font-medium text-ink">{user.name}</p>
      <p className="text-muted">{user.roleLabel}</p>
      <Link href="/" className="mt-2 inline-flex min-h-9 items-center text-plum underline">Lihat toko</Link>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-2 lg:hidden">
        <button type="button" onClick={() => dialog.current?.showModal()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Buka menu admin">
          <MenuIcon />
        </button>
        <LogoMark className="h-7 w-7" />
        <span className="font-serif text-lg tracking-[0.15em] text-plum">ADMIN</span>
      </div>
      <dialog ref={dialog} className="m-0 h-dvh max-h-none w-72 bg-white p-0 backdrop:bg-ink/40" aria-label="Menu admin">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-serif text-xl tracking-[0.15em] text-plum">ZEL ADMIN</span>
            <button type="button" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-blush" aria-label="Tutup">
              <CloseIcon />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3" aria-label="Admin">{list}</nav>
          {footer}
        </div>
      </dialog>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5">
          <LogoMark className="h-8 w-8" />
          <span className="font-serif text-xl tracking-[0.15em] text-plum">ZEL ADMIN</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3" aria-label="Admin">{list}</nav>
        {footer}
      </aside>
    </>
  );
}
