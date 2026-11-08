"use client";

export type Uploaded = { url: string; width?: number; height?: number };
export type UploadTarget =
  | { mode: "cloudinary"; url: string; apiKey: string; signature: string; folder: string; timestamp: string; transformation: string }
  | { mode: "local" }
  | { mode: "disabled" };

/** Unggah satu gambar ke target: langsung ke Cloudinary (bertanda tangan) atau endpoint lokal saat pengembangan. */
export async function uploadToTarget(file: File, t: UploadTarget, localUrl: string, toDelivery: (secureUrl: string) => Promise<string>): Promise<Uploaded> {
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
    return { url: await toDelivery(body.secure_url), width: body.width, height: body.height };
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(localUrl, { method: "POST", body: fd });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Upload gagal");
  return body;
}

export function checkImageFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: bukan file gambar`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: maksimal 8 MB`);
}
