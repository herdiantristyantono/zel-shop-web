import "server-only";
import { createHash } from "node:crypto";

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

/** URL tampilan: format & kualitas otomatis (WebP/AVIF), lebar maks 1600. */
export function cloudinaryDeliveryUrl(secureUrl: string) {
  return secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1600/");
}
