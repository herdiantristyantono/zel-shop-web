"use server";

import { adminAction } from "@/lib/admin";
import { cloudinaryDeliveryUrl, cloudinarySignature, isCloudinaryEnabled, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/upload";
import type { UploadTarget } from "@/components/upload-client";

export async function getUploadTarget(folder: UploadFolder) {
  return adminAction<UploadTarget>(folder === "banners" ? "promo" : "products", async () => {
    if (!UPLOAD_FOLDERS.includes(folder) || folder === "reviews") return { ok: false, error: "Folder tidak valid." };
    if (isCloudinaryEnabled()) return { ok: true, data: { mode: "cloudinary", ...cloudinarySignature(folder) } };
    if (process.env.NODE_ENV !== "production") return { ok: true, data: { mode: "local" } };
    return { ok: true, data: { mode: "disabled" } };
  });
}

export async function toDeliveryUrl(secureUrl: string) {
  if (!/^https:\/\/res\.cloudinary\.com\//.test(secureUrl)) return "";
  return cloudinaryDeliveryUrl(secureUrl);
}
