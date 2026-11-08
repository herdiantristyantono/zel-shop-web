"use client";

import { getUploadTarget, toDeliveryUrl } from "@/actions/admin/upload";
import { checkImageFile, uploadToTarget, type Uploaded } from "../upload-client";

export type { Uploaded };

export async function uploadImage(file: File, folder: "products" | "banners" | "categories"): Promise<Uploaded> {
  checkImageFile(file);
  const target = await getUploadTarget(folder);
  if (!target.ok) throw new Error(target.error);
  return uploadToTarget(file, target.data!, `/api/admin/upload?folder=${folder}`, toDeliveryUrl);
}
