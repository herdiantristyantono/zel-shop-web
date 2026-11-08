"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { UserIcon } from "./icons";

export function AccountLink() {
  const { data, isPending } = useSession();
  const user = data?.user;
  return (
    <Link
      href={user ? "/akun" : "/masuk"}
      className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 text-ink hover:bg-blush"
      aria-label={user ? `Akun saya (${user.name})` : "Masuk atau daftar"}
    >
      <UserIcon />
      <span className="hidden text-sm lg:inline">{isPending ? "" : user ? user.name.split(" ")[0] : "Masuk"}</span>
    </Link>
  );
}
