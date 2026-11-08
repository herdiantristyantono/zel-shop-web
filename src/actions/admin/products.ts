"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { adminAction, AdminError } from "@/lib/admin";
import { fieldErrors, productInput, type ProductInput } from "@/lib/admin-validation";
import { TAGS } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { notifyWishlist } from "@/lib/wishlist-notify";

function bust(slugs: string[]) {
  updateTag(TAGS.products);
  updateTag(TAGS.categories);
  updateTag(TAGS.home);
  for (const s of slugs) updateTag(`product:${s}`);
}

export async function saveProduct(input: ProductInput) {
  return adminAction<{ id: string }>("products", async (user) => {
    const parsed = productInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Periksa kembali isian yang ditandai.", fieldErrors: fieldErrors(parsed.error) };
    const d = parsed.data;
    const slug = slugify(d.slug || d.name);
    if (!slug) return { ok: false, error: "Slug tidak valid.", fieldErrors: { slug: "Slug tidak valid" } };

    const before = d.id
      ? await prisma.product.findUnique({ where: { id: d.id }, include: { variants: { select: { id: true, stock: true } } } })
      : null;
    if (d.id && !before) return { ok: false, error: "Produk tidak ditemukan." };

    const data = {
      name: d.name,
      slug,
      categoryId: d.categoryId,
      description: d.description,
      material: d.material,
      size: d.size,
      lengthCm: d.lengthCm,
      widthCm: d.widthCm,
      heightCm: d.heightCm,
      weightGram: d.weightGram,
      cardSlots: d.cardSlots,
      compartments: d.compartments || null,
      price: d.price,
      compareAtPrice: d.compareAtPrice,
      isPublished: d.isPublished,
      isFeatured: d.isFeatured,
      minStockAlert: d.minStockAlert,
      metaTitle: d.metaTitle || null,
      metaDescription: d.metaDescription || null,
    };

    const restocked: boolean[] = [];
    const id = await prisma.$transaction(async (tx) => {
      const product = d.id ? await tx.product.update({ where: { id: d.id }, data }) : await tx.product.create({ data });

      // Varian: hapus yang dibuang, perbarui yang ada, buat yang baru. Perubahan stok dicatat.
      const keepIds = d.variants.flatMap((v) => (v.id ? [v.id] : []));
      await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });
      const refToId = new Map<string, string>();
      for (const [i, v] of d.variants.entries()) {
        const vData = { colorName: v.colorName, colorHex: v.colorHex.toUpperCase(), sku: v.sku, stock: v.stock, priceOverride: v.priceOverride, isActive: v.isActive, sortOrder: i };
        if (v.id) {
          const old = before?.variants.find((x) => x.id === v.id);
          if (!old) throw new AdminError("Varian tidak valid.");
          await tx.productVariant.update({ where: { id: v.id }, data: vData });
          if (old.stock !== v.stock) {
            await tx.stockMovement.create({ data: { variantId: v.id, change: v.stock - old.stock, balance: v.stock, reason: "ADJUSTMENT", note: "Diubah lewat form produk", userId: user.id } });
            if (old.stock === 0 && v.stock > 0) restocked.push(true);
          }
          refToId.set(v.ref, v.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...vData, productId: product.id } });
          if (v.stock > 0) await tx.stockMovement.create({ data: { variantId: created.id, change: v.stock, balance: v.stock, reason: "INITIAL", note: "Varian baru", userId: user.id } });
          refToId.set(v.ref, created.id);
        }
      }

      // Foto: urutan = urutan array, yang pertama = foto utama.
      const keepImg = d.images.flatMap((i) => (i.id ? [i.id] : []));
      await tx.productImage.deleteMany({ where: { productId: product.id, id: { notIn: keepImg } } });
      for (const [i, img] of d.images.entries()) {
        const imgData = {
          url: img.url,
          alt: img.alt || `${d.name} foto ${i + 1}`,
          variantId: img.variantRef ? (refToId.get(img.variantRef) ?? null) : null,
          sortOrder: i,
          isPrimary: i === 0,
          width: img.width ?? null,
          height: img.height ?? null,
        };
        if (img.id) await tx.productImage.update({ where: { id: img.id }, data: imgData });
        else await tx.productImage.create({ data: { ...imgData, productId: product.id } });
      }
      return product.id;
    });

    bust([slug, ...(before && before.slug !== slug ? [before.slug] : [])]);

    // Notifikasi wishlist setelah respons terkirim
    const wentOnSale = before && (d.price < before.price || (d.compareAtPrice != null && before.compareAtPrice == null));
    if (wentOnSale) after(() => notifyWishlist(id, "sale").then(() => undefined));
    if (restocked.length) after(() => notifyWishlist(id, "restock").then(() => undefined));

    return { ok: true, data: { id }, message: d.id ? "Produk disimpan." : "Produk dibuat." };
  });
}

export async function setProductPublished(id: string, isPublished: boolean) {
  return adminAction("products", async () => {
    const p = await prisma.product.update({ where: { id }, data: { isPublished: Boolean(isPublished) } });
    bust([p.slug]);
    return { ok: true };
  });
}

export async function deleteProduct(id: string) {
  return adminAction("products", async () => {
    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used > 0) return { ok: false, error: "Produk sudah pernah dipesan sehingga tidak bisa dihapus (riwayat & ulasan akan hilang). Sembunyikan saja." };
    const p = await prisma.product.delete({ where: { id } });
    bust([p.slug]);
    return { ok: true, message: "Produk dihapus." };
  });
}
