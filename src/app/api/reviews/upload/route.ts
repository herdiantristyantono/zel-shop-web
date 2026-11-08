import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { findReviewableItem } from "@/lib/reviews";
import { localUploadAllowed, saveLocalWebp } from "@/lib/upload";

/** Upload lokal foto ulasan (hanya pengembangan) — khusus pembeli dengan item yang bisa diulas. */
export async function POST(req: NextRequest) {
  if (!localUploadAllowed()) return Response.json({ error: "Gunakan Cloudinary" }, { status: 400 });
  const session = await getSession();
  const itemId = req.nextUrl.searchParams.get("item") ?? "";
  if (!session || !itemId || !(await findReviewableItem(session.user.id, itemId))) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const r = await saveLocalWebp(await req.formData(), "reviews");
  return Response.json(r, { status: "error" in r ? 400 : 200 });
}
