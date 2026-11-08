import "server-only";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const UPLOAD_FOLDERS = ["products", "banners", "categories", "reviews"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const cfg = () => ({
  cloud: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  key: process.env.CLOUDINARY_API_KEY ?? "",
  secret: process.env.CLOUDINARY_API_SECRET ?? "",
});
export const isCloudinaryEnabled = () => Boolean(cfg().cloud && cfg().key && cfg().secret);

/** Parameter upload bertanda tangan: browser mengunggah langsung ke Cloudinary (file tidak lewat server kita). */
export function cloudinarySignature(folder: UploadFolder) {
  const { cloud, key, secret } = cfg();
  const params = {
    folder: `zelshop/${folder}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: "c_limit,w_2000,h_2000", // batasi resolusi asli yang disimpan
  };
  const toSign = (Object.keys(params) as (keyof typeof params)[]).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + secret).digest("hex");
  return { url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`, apiKey: key, signature, ...params };
}

const DELIVERY = "f_auto,q_auto,c_limit,w_1600";

/** URL tampilan: format & kualitas otomatis (WebP/AVIF), lebar maks 1600. */
export function cloudinaryDeliveryUrl(secureUrl: string) {
  return secureUrl.replace("/image/upload/", `/image/upload/${DELIVERY}/`);
}

/** Pastikan URL foto benar-benar hasil unggahan kita ke folder tersebut (bukan tautan luar sembarang). */
export function isOwnUploadUrl(url: string, folder: UploadFolder) {
  if (process.env.NODE_ENV !== "production" && new RegExp(`^/uploads/${folder}/[0-9a-f-]{36}\\.webp$`).test(url)) return true;
  const cloud = cfg().cloud;
  if (!cloud) return false;
  const esc = cloud.replace(/[^a-zA-Z0-9_-]/g, "");
  return new RegExp(`^https://res\\.cloudinary\\.com/${esc}/image/upload/${DELIVERY}/(v\\d+/)?zelshop/${folder}/[\\w-]+\\.[a-z0-9]{3,4}$`).test(url);
}

const MAX = 8 * 1024 * 1024;

/**
 * Penyimpanan LOKAL untuk pengembangan (tanpa Cloudinary): kompres → WebP 1600px → public/uploads.
 * Di produksi wajib Cloudinary (server serverless tidak bisa menyimpan file permanen).
 */
export async function saveLocalWebp(form: FormData, folder: UploadFolder): Promise<{ url: string; width: number; height: number } | { error: string }> {
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "File tidak ada" };
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) return { error: "Format harus JPG, PNG, WebP, atau HEIC" };
  if (file.size > MAX) return { error: "Ukuran maksimal 8 MB" };
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
    return { url: `/uploads/${folder}/${name}`, width: info.width, height: info.height };
  } catch {
    return { error: "Gambar tidak dapat diproses" };
  }
}

export const localUploadAllowed = () => !isCloudinaryEnabled() && process.env.NODE_ENV !== "production";
