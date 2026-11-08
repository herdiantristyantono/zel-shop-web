import type { NextRequest } from "next/server";
import { assertStaff } from "@/lib/admin";
import { localUploadAllowed, saveLocalWebp, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/upload";

/** Upload lokal (hanya pengembangan, tanpa Cloudinary). */
export async function POST(req: NextRequest) {
  if (!localUploadAllowed()) return Response.json({ error: "Gunakan Cloudinary" }, { status: 400 });
  const folder = (req.nextUrl.searchParams.get("folder") ?? "products") as UploadFolder;
  if (!UPLOAD_FOLDERS.includes(folder) || folder === "reviews") return Response.json({ error: "Folder tidak valid" }, { status: 400 });
  try {
    await assertStaff(folder === "banners" ? "promo" : "products");
  } catch {
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const r = await saveLocalWebp(await req.formData(), folder);
  return Response.json(r, { status: "error" in r ? 400 : 200 });
}
