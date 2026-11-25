/**
 * Unggah produk massal dari folder foto.
 *
 * Struktur folder:
 *   <folder>/
 *     products.json                       ← data produk (lihat contoh di bawah)
 *     Les catino numa shoulder [80rb]/    ← satu subfolder = satu produk; harga dari [..] di nama folder
 *       foto1.jpeg, foto2.jpeg            ← foto pertama (urut nama, atau sesuai "images") = foto utama
 *
 * products.json:
 *   {
 *     "category": "tas-selempang",
 *     "products": {
 *       "Les catino numa shoulder [80rb]": {
 *         "name": "Les Catino Numa Shoulder Bag", "sku": "ZS-LCN-01",
 *         "colorName": "Putih Gading", "colorHex": "#ECE7DD",
 *         "size": "SMALL", "lengthCm": 23, "widthCm": 6, "heightCm": 13, "weightGram": 300,
 *         "description": "…",
 *         // opsional: slug, price, stock (1), material ("Kulit sintetis (PU)"), images ([nama file, urut])
 *       }
 *     }
 *   }
 *
 * Jalankan:
 *   npx tsx scripts/upload-products.ts "<folder>" --dry-run                    # cek saja, tidak menulis apa pun
 *   npx tsx scripts/upload-products.ts "<folder>"                              # ke DB lokal (.env), foto ke public/uploads
 *   npx tsx scripts/upload-products.ts "<folder>" --env .env.production.local  # ke produksi, foto ke Cloudinary
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import sharp from "sharp";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/format";

// ── Argumen & env ────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const envFile = flag("--env") ?? ".env";
const dryRun = args.includes("--dry-run");
const root = args.find((a) => !a.startsWith("--"));
if (!root || !existsSync(root)) fail("Pakai: npx tsx scripts/upload-products.ts <folder> [--env <file>] [--dry-run]");
if (!existsSync(envFile)) fail(`File env tidak ditemukan: ${envFile}`);
config({ path: envFile, override: true, quiet: true });

const DATABASE_URL = process.env.DATABASE_URL ?? fail(`DATABASE_URL kosong di ${envFile}`);
const dbHost = new URL(DATABASE_URL).hostname;
const isLocalDb = ["localhost", "127.0.0.1", "::1"].includes(dbHost);
const cld = {
  cloud: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  key: process.env.CLOUDINARY_API_KEY ?? "",
  secret: process.env.CLOUDINARY_API_SECRET ?? "",
};
const useCloudinary = Boolean(cld.cloud && cld.key && cld.secret);
// Foto lokal (/uploads/...) tidak ada di server produksi → jangan pernah tulis ke DB non-lokal tanpa Cloudinary.
if (!isLocalDb && !useCloudinary) fail(`DB ${dbHost} bukan lokal, tetapi CLOUDINARY_* belum lengkap di ${envFile}`);

// ── Data produk ──────────────────────────────────────────────────
const Item = z.object({
  name: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().min(3),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).default(1),
  colorName: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  size: z.enum(["MINI", "SMALL", "MEDIUM", "LARGE"]),
  material: z.string().default("Kulit sintetis (PU)"),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  weightGram: z.number().int().positive(),
  cardSlots: z.number().int().optional(),
  compartments: z.string().optional(),
  description: z.string().min(10),
  images: z.array(z.string()).optional(),
});
const Data = z.object({ category: z.string(), products: z.record(z.string(), Item) });

const dataPath = join(root, "products.json");
if (!existsSync(dataPath)) fail(`Tidak ada ${dataPath}`);
const data = Data.parse(JSON.parse(readFileSync(dataPath, "utf8")));

/** "[80rb]" → 80000, "[80k]" → 80000, "[1,2jt]" → 1200000, "[75000]" → 75000 */
function priceFromName(name: string) {
  const m = name.match(/\[\s*([\d.,]+)\s*(rb|k|jt)?\s*\]/i);
  if (!m) return undefined;
  const unit = m[2]?.toLowerCase();
  const num = unit ? Number(m[1].replace(",", ".")) : Number(m[1].replace(/[.,]/g, ""));
  return Math.round(num * (unit === "jt" ? 1_000_000 : unit ? 1000 : 1));
}

const IMG = /\.(jpe?g|png|webp|heic|heif|avif)$/i;
const subfolders = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const f of subfolders) if (!data.products[f]) fail(`Subfolder "${f}" belum ada di products.json`);

const plan = Object.entries(data.products).map(([folder, p]) => {
  const dir = join(root, folder);
  if (!existsSync(dir)) fail(`products.json menyebut "${folder}", tetapi foldernya tidak ada`);
  const files = p.images ?? readdirSync(dir).filter((f) => IMG.test(f)).sort();
  if (!files.length) fail(`Tidak ada foto di "${folder}"`);
  for (const f of files) if (!existsSync(join(dir, f))) fail(`Foto tidak ada: ${folder}/${f}`);
  const price = p.price ?? priceFromName(folder) ?? fail(`Harga tidak ada: tulis [80rb] di nama folder "${folder}" atau isi "price"`);
  return { ...p, slug: p.slug ?? slugify(p.name), price, files: files.map((f) => join(dir, f)) };
});

// ── Unggah foto ──────────────────────────────────────────────────
// Sama dengan src/lib/upload.ts (file itu "server-only", tidak bisa diimpor dari script).
const DELIVERY = "f_auto,q_auto,c_limit,w_1600";

async function uploadImage(path: string) {
  if (!useCloudinary) {
    const { data: buf, info } = await sharp(path)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const dir = join(process.cwd(), "public", "uploads", "products");
    await mkdir(dir, { recursive: true });
    const name = `${crypto.randomUUID()}.webp`;
    await writeFile(join(dir, name), buf);
    return { url: `/uploads/products/${name}`, width: info.width, height: info.height };
  }
  const buf = await sharp(path).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const params = {
    folder: "zelshop/products",
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: "c_limit,w_2000,h_2000",
  };
  const toSign = (Object.keys(params) as (keyof typeof params)[]).sort().map((k) => `${k}=${params[k]}`).join("&");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), "photo.jpg");
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", cld.key);
  form.append("signature", createHash("sha1").update(toSign + cld.secret).digest("hex"));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cld.cloud}/image/upload`, { method: "POST", body: form });
  const json = (await res.json()) as { secure_url?: string; width?: number; height?: number; error?: { message: string } };
  if (!res.ok || !json.secure_url) throw new Error(`Cloudinary: ${json.error?.message ?? res.status}`);
  return { url: json.secure_url.replace("/image/upload/", `/image/upload/${DELIVERY}/`), width: json.width, height: json.height };
}

// ── Main ─────────────────────────────────────────────────────────
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL, max: 1 }) });

async function main() {
  console.log(`Target DB : ${dbHost}${isLocalDb ? " (lokal)" : ""}`);
  console.log(`Foto      : ${useCloudinary ? `Cloudinary (${cld.cloud})` : "public/uploads/products (lokal)"}`);

  const category = await prisma.category.findUnique({ where: { slug: data.category }, select: { id: true, name: true } });
  if (!category) fail(`Kategori "${data.category}" tidak ada di DB ${dbHost}`);
  console.log(`Kategori  : ${category.name}\n`);

  const takenSlugs = await prisma.product.findMany({ where: { slug: { in: plan.map((p) => p.slug) } }, select: { slug: true } });
  const takenSkus = await prisma.productVariant.findMany({ where: { sku: { in: plan.map((p) => p.sku) } }, select: { sku: true } });
  if (takenSlugs.length || takenSkus.length)
    fail(`Sudah ada di DB — slug: ${takenSlugs.map((s) => s.slug).join(", ") || "-"} · SKU: ${takenSkus.map((s) => s.sku).join(", ") || "-"}`);

  for (const p of plan) console.log(`• ${p.name} — Rp${p.price.toLocaleString("id-ID")} · ${p.colorName} · ${p.sku} · ${p.files.length} foto`);
  if (dryRun) return console.log("\n--dry-run: tidak ada yang diunggah atau disimpan.");

  // Unggah semua foto dulu; kalau ada yang gagal, DB belum tersentuh sama sekali.
  console.log("\nMengunggah foto…");
  const uploaded: Awaited<ReturnType<typeof uploadImage>>[][] = [];
  for (const p of plan) uploaded.push(await Promise.all(p.files.map(uploadImage)));

  await prisma.$transaction(async (tx) => {
    for (const [i, p] of plan.entries()) {
      const product = await tx.product.create({
        data: {
          name: p.name, slug: p.slug, description: p.description, material: p.material, size: p.size,
          lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, weightGram: p.weightGram,
          cardSlots: p.cardSlots, compartments: p.compartments, price: p.price, categoryId: category.id,
          variants: { create: { colorName: p.colorName, colorHex: p.colorHex, sku: p.sku, stock: p.stock } },
        },
        select: { id: true, variants: { select: { id: true } } },
      });
      // Sama dengan admin (src/actions/admin/products.ts): stok awal tercatat di riwayat stok.
      if (p.stock > 0)
        await tx.stockMovement.create({
          data: { variantId: product.variants[0].id, change: p.stock, balance: p.stock, reason: "INITIAL", note: "Varian baru" },
        });
      await tx.productImage.createMany({
        data: uploaded[i].map((img, n) => ({
          productId: product.id, variantId: product.variants[0].id, url: img.url, alt: `${p.name} ${p.colorName}`,
          width: img.width, height: img.height, sortOrder: n, isPrimary: n === 0,
        })),
      });
      console.log(`✔ ${p.name} → /produk/${p.slug}`);
    }
  });
  console.log("\nSelesai. Katalog di-cache beberapa menit, jadi produk baru bisa butuh sebentar untuk muncul.");
}

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
