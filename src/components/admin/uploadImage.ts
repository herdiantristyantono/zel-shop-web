"use client";

import { getUploadTarget, toDeliveryUrl } from "@/actions/admin/upload";

export type Uploaded = { url: string; width?: number; height?: number };

/** Unggah satu gambar: langsung ke Cloudinary (bertanda tangan) atau ke endpoint lokal saat pengembangan. */
export async function uploadImage(file: File, folder: "products" | "banners" | "categories"): Promise<Uploaded> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: bukan file gambar`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: maksimal 8 MB`);
  const target = await getUploadTarget(folder);
  if (!target.ok) throw new Error(target.error);
  const t = target.data!;
  if (t.mode === "disabled") throw new Error("Penyimpanan gambar belum dikonfigurasi (isi kunci Cloudinary).");

  if (t.mode === "cloudinary") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", t.apiKey);
    fd.append("timestamp", t.timestamp);
    fd.append("folder", t.folder);
    fd.append("transformation", t.transformation);
    fd.append("signature", t.signature);
    const res = await fetch(t.url, { method: "POST", body: fd });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message ?? "Upload gagal");
    return { url: await toDeliveryUrl(body.secure_url), width: body.width, height: body.height };
  }

  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/upload?folder=${folder}`, { method: "POST", body: fd });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Upload gagal");
  return body;
}
