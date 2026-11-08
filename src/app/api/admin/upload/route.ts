import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import { assertStaff } from "@/lib/admin";
import { isCloudinaryEnabled, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/upload";

const MAX = 8 * 1024 * 1024;

/**
 * Penyimpanan LOKAL untuk pengembangan (tanpa Cloudinary): kompres → WebP 1600px → public/uploads.
 * Di produksi wajib Cloudinary (server serverless tidak bisa menyimpan file permanen).
 */
export async function POST(req: NextRequest) {
  if (isCloudinaryEnabled() || process.env.NODE_ENV === "production") return Response.json({ error: "Gunakan Cloudinary" }, { status: 400 });
  const folder = (req.nextUrl.searchParams.get("folder") ?? "products") as UploadFolder;
  try {
    await assertStaff(folder === "banners" ? "promo" : "products");
  } catch {
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  if (!UPLOAD_FOLDERS.includes(folder)) return Response.json({ error: "Folder tidak valid" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "File tidak ada" }, { status: 400 });
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) return Response.json({ error: "Format harus JPG, PNG, WebP, atau HEIC" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Ukuran maksimal 8 MB" }, { status: 400 });

  try {
    const { data, info } = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const dir = join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    const name = `${crypto.randomUUID()}.webp`;
    await writeFile(join(dir, name), data);
    return Response.json({ url: `/uploads/${folder}/${name}`, width: info.width, height: info.height });
  } catch {
    return Response.json({ error: "Gambar tidak dapat diproses" }, { status: 400 });
  }
}
