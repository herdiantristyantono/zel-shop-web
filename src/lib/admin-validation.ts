import { z } from "zod";

const money = z.coerce.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif").max(100_000_000);
const optMoney = z.preprocess((v) => (v === "" || v == null ? null : v), money.nullable());

export const variantInput = z.object({
  id: z.string().max(40).optional(),
  ref: z.string().max(40), // id lama atau "new:N" (untuk menautkan foto ke varian baru)
  colorName: z.string().trim().min(1, "Nama warna wajib").max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format #RRGGBB"),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, "SKU 3–40 huruf/angka/-"),
  stock: z.coerce.number().int().min(0).max(100_000),
  priceOverride: optMoney,
  isActive: z.boolean(),
});

export const imageInput = z.object({
  id: z.string().max(40).optional(),
  url: z.string().max(500).refine((u) => u.startsWith("/") || u.startsWith("https://res.cloudinary.com/"), "URL gambar tidak valid"),
  alt: z.string().trim().max(160),
  variantRef: z.string().max(40).nullable(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});

export const productInput = z
  .object({
    id: z.string().max(40).optional(),
    name: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
    slug: z.string().trim().max(140).optional(),
    categoryId: z.string().min(1, "Pilih kategori"),
    description: z.string().trim().min(20, "Deskripsi minimal 20 karakter").max(5000),
    material: z.string().trim().min(2, "Bahan wajib diisi").max(160),
    size: z.enum(["MINI", "SMALL", "MEDIUM", "LARGE"]),
    lengthCm: z.coerce.number().positive("Isi panjang").max(200),
    widthCm: z.coerce.number().positive("Isi lebar").max(200),
    heightCm: z.coerce.number().positive("Isi tinggi").max(200),
    weightGram: z.coerce.number().int().positive("Isi berat").max(30_000),
    cardSlots: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(0).max(100).nullable()),
    compartments: z.string().trim().max(300).optional(),
    price: money.refine((v) => v >= 1000, "Harga minimal Rp 1.000"),
    compareAtPrice: optMoney,
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    minStockAlert: z.coerce.number().int().min(0).max(1000),
    metaTitle: z.string().trim().max(70).optional(),
    metaDescription: z.string().trim().max(160).optional(),
    variants: z.array(variantInput).min(1, "Minimal 1 varian warna").max(30),
    images: z.array(imageInput).max(30),
  })
  .refine((p) => p.compareAtPrice == null || p.compareAtPrice > p.price, { path: ["compareAtPrice"], message: "Harga coret harus lebih tinggi dari harga jual" })
  .refine((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length, { path: ["variants"], message: "SKU varian tidak boleh sama" });

export type ProductInput = z.input<typeof productInput>;

export function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".")] ??= i.message;
  return out;
}
