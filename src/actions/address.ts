"use server";

import { refresh } from "next/cache";
import type { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressSchema, type AddressInput } from "@/lib/validation";

type Result = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function errors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of e.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

export async function saveAddress(input: AddressInput, id?: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Silakan masuk." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian alamat.", fieldErrors: errors(parsed.error) };
  const userId = session.user.id;
  const data = parsed.data;

  const saved = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= 10 && !id) throw new Error("LIMIT");
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    if (id) {
      const own = await tx.address.findFirst({ where: { id, userId } });
      if (!own) throw new Error("NOT_FOUND");
      return tx.address.update({ where: { id }, data: { ...data, isDefault: makeDefault || own.isDefault } });
    }
    return tx.address.create({ data: { ...data, userId, isDefault: makeDefault } });
  }).catch((e: Error) => e);

  if (saved instanceof Error) return { ok: false, error: saved.message === "LIMIT" ? "Maksimal 10 alamat." : "Alamat tidak ditemukan." };
  refresh();
  return { ok: true, id: saved.id };
}

export async function deleteAddress(id: string) {
  const session = await getSession();
  if (!session) return;
  const userId = session.user.id;
  const deleted = await prisma.address.deleteMany({ where: { id, userId } });
  if (deleted.count) {
    const hasDefault = await prisma.address.count({ where: { userId, isDefault: true } });
    if (!hasDefault) {
      const first = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      if (first) await prisma.address.update({ where: { id: first.id }, data: { isDefault: true } });
    }
  }
  refresh();
}

export async function setDefaultAddress(id: string) {
  const session = await getSession();
  if (!session) return;
  const userId = session.user.id;
  const own = await prisma.address.findFirst({ where: { id, userId } });
  if (!own) return;
  await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
  refresh();
}
