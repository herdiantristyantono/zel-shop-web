"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { adminAction, ROLE_LABEL } from "@/lib/admin";
import { fieldErrors } from "@/lib/admin-validation";
import { TAGS } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS } from "@/lib/settings";
import { COURIER_NAMES } from "@/lib/shipping";

const optUrl = z
  .string()
  .trim()
  .max(200)
  .refine((u) => !u || u.startsWith("https://"), "Harus diawali https://")
  .transform((u) => u || null);
const optInt = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(0).max(100_000_000).nullable());

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(100).transform((v) => v || null),
  email: z.union([z.literal(""), z.string().trim().email("Email tidak valid")]).transform((v) => v || null),
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^0/, "62"))
    .pipe(z.string().regex(/^628\d{7,12}$/, "Format 628xxxxxxxxxx")),
  address: z.string().trim().max(300).transform((v) => v || null),
  originAreaId: z.string().trim().max(80).transform((v) => v || null),
  originCity: z.string().trim().max(80).transform((v) => v || null),
  originPostalCode: z.string().trim().max(10).transform((v) => v || null),
  activeCouriers: z.array(z.string().refine((c) => c in COURIER_NAMES)).min(1, "Pilih minimal 1 kurir"),
  paymentMethods: z.array(z.string().refine((m) => m in PAYMENT_METHODS)).min(1, "Pilih minimal 1 metode"),
  paymentTimeoutMins: z.coerce.number().int().min(15, "Minimal 15 menit").max(4320, "Maksimal 3 hari"),
  freeShippingMin: optInt,
  freeShippingMax: optInt,
  instagramUrl: optUrl,
  tiktokUrl: optUrl,
  shopeeUrl: optUrl,
  tokopediaUrl: optUrl,
});

export async function saveStoreSettings(input: z.input<typeof settingsSchema>) {
  return adminAction("settings", async () => {
    const p = settingsSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Periksa isian yang ditandai.", fieldErrors: fieldErrors(p.error) };
    await prisma.storeSettings.upsert({ where: { id: 1 }, update: p.data, create: { id: 1, ...p.data } });
    updateTag("settings");
    updateTag(TAGS.home);
    refresh();
    return { ok: true, message: "Pengaturan disimpan." };
  });
}

const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  title: z.string().trim().min(2).max(100),
  summary: z.string().trim().max(300).transform((v) => v || null),
  content: z.string().trim().min(10, "Konten terlalu pendek").max(30_000),
});

export async function savePage(input: z.input<typeof pageSchema>) {
  return adminAction("settings", async () => {
    const p = pageSchema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    await prisma.page.upsert({ where: { slug: p.data.slug }, update: p.data, create: p.data });
    updateTag(TAGS.pages);
    refresh();
    return { ok: true, message: "Halaman disimpan." };
  });
}

const roleSchema = z.object({ email: z.string().trim().toLowerCase().email("Email tidak valid"), role: z.enum(["OWNER", "ADMIN", "STAFF", "CUSTOMER"]) });

/** Tambah/ubah/cabut akses tim. Pengguna harus sudah punya akun (daftar dulu di /daftar). */
export async function setUserRole(input: z.input<typeof roleSchema>) {
  return adminAction("settings", async (me) => {
    const p = roleSchema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const user = await prisma.user.findUnique({ where: { email: p.data.email } });
    if (!user) return { ok: false, error: "Akun dengan email ini belum terdaftar. Minta yang bersangkutan mendaftar dulu." };
    if (user.id === me.id) return { ok: false, error: "Anda tidak bisa mengubah peran sendiri." };
    if (user.role === "OWNER" && p.data.role !== "OWNER") {
      const owners = await prisma.user.count({ where: { role: "OWNER" } });
      if (owners <= 1) return { ok: false, error: "Harus ada minimal satu Owner." };
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { role: p.data.role } });
      // Paksa login ulang agar peran baru langsung berlaku
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    refresh();
    return { ok: true, message: `${user.name} sekarang ${p.data.role === "CUSTOMER" ? "pelanggan (akses dicabut)" : ROLE_LABEL[p.data.role]}.` };
  });
}
