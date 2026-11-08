import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./prisma";

export type StaffRole = "OWNER" | "ADMIN" | "STAFF";
export type Permission = "dashboard" | "revenue" | "orders" | "orders.cancel" | "stock" | "products" | "customers" | "promo" | "reviews" | "reports" | "settings";

const ALL: Permission[] = ["dashboard", "revenue", "orders", "orders.cancel", "stock", "products", "customers", "promo", "reviews", "reports", "settings"];

/** Hak akses per peran. Staf Gudang hanya pesanan & stok. */
export const PERMISSIONS: Record<StaffRole, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "settings"),
  STAFF: ["dashboard", "orders", "stock"],
};

export const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staf Gudang", CUSTOMER: "Pelanggan" };

export function can(role: string | null | undefined, perm: Permission) {
  return role != null && role in PERMISSIONS && PERMISSIONS[role as StaffRole].includes(perm);
}

export type StaffUser = { id: string; name: string; email: string; role: StaffRole };

/** Peran dibaca langsung dari database (bukan cache cookie sesi) agar pencabutan akses langsung berlaku. */
async function currentStaff() {
  const session = await getSession();
  if (!session) return { session: null, user: null };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, banned: true } });
  return { session, user: user && !user.banned ? user : null };
}

/** Untuk halaman admin: alihkan jika belum login / tidak berhak. */
export async function requireStaff(perm: Permission = "dashboard"): Promise<StaffUser> {
  const { session, user } = await currentStaff();
  if (!session) redirect("/masuk?next=/admin");
  if (!user || !can(user.role, "dashboard")) redirect("/");
  if (!can(user.role, perm)) redirect("/admin?akses=ditolak");
  return { id: user.id, name: user.name, email: user.email, role: user.role as StaffRole };
}

/** Untuk Server Action / Route Handler admin: lempar error jika tidak berhak (tidak redirect). */
export async function assertStaff(perm: Permission): Promise<StaffUser> {
  const { user } = await currentStaff();
  if (!user || !can(user.role, perm)) throw new AdminError("Anda tidak memiliki akses untuk tindakan ini.");
  return { id: user.id, name: user.name, email: user.email, role: user.role as StaffRole };
}

export class AdminError extends Error {}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Bungkus Server Action admin: cek izin + tangkap error jadi pesan ramah. */
export async function adminAction<T>(perm: Permission, fn: (user: StaffUser) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const user = await assertStaff(perm);
    return await fn(user);
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, error: e.message };
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { ok: false, error: "Data duplikat: SKU / kode / slug sudah dipakai." };
    console.error("[admin]", e);
    return { ok: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
