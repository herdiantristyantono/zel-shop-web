import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/format";
import { categories, COLORS, products, testimonials } from "./seed-data";
import { pages } from "./seed-pages";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DAY = 86_400_000;

async function main() {
  console.log("Menghapus data katalog lama…");
  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany(),
    prisma.flashSale.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.testimonial.deleteMany(),
  ]);

  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, imageUrl: `/images/categories/${c.slug}.svg`, sortOrder: i },
    });
    catIds[c.slug] = row.id;
  }

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        material: p.material,
        size: p.size,
        lengthCm: p.dims[0],
        widthCm: p.dims[1],
        heightCm: p.dims[2],
        weightGram: p.weightGram,
        cardSlots: p.cardSlots,
        compartments: p.compartments,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        isFeatured: p.featured ?? false,
        soldCount: p.soldCount,
        categoryId: catIds[p.category],
        createdAt: new Date(Date.now() - p.daysAgo * DAY),
        metaDescription: p.description.slice(0, 155),
      },
    });
    for (const [vi, v] of p.variants.entries()) {
      const colorSlug = slugify(v.color);
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorName: v.color,
          colorHex: COLORS[v.color],
          sku: `ZEL-${p.slug.split("-")[0].toUpperCase()}-${colorSlug.toUpperCase().replace(/-/g, "")}`,
          stock: v.stock,
          sortOrder: vi,
          stockMoves: { create: { change: v.stock, balance: v.stock, reason: "INITIAL", note: "Stok awal (seed)" } },
        },
      });
      const views = ["tampak depan", "tampak samping", "detail bahan & aksesori"];
      await prisma.productImage.createMany({
        data: views.map((label, i) => ({
          productId: product.id,
          variantId: variant.id,
          url: `/images/products/${p.slug}/${colorSlug}-${i + 1}.svg`,
          alt: `${p.name} warna ${v.color}, ${label}`,
          width: 800,
          height: 800,
          sortOrder: vi * 10 + i,
          isPrimary: vi === 0 && i === 0,
        })),
      });
    }
  }

  // Ulasan contoh (rating) — pembeli contoh dengan pesanan selesai, agar aturan "pembeli terverifikasi" tetap konsisten.
  await seedReviews();

  await prisma.banner.createMany({
    data: [
      { title: "Koleksi Baru Musim Ini", subtitle: "Tas & dompet bernuansa lembut untuk setiap momen.", imageUrl: "/images/banners/koleksi-baru.svg", linkUrl: "/produk?sort=terbaru", ctaLabel: "Lihat Koleksi", sortOrder: 0 },
      { title: "Flash Sale hingga 25%", subtitle: "Harga spesial terbatas — jangan sampai kehabisan.", imageUrl: "/images/banners/flash-sale.svg", linkUrl: "/promo", ctaLabel: "Belanja Promo", sortOrder: 1 },
    ],
  });

  const flashProducts = await prisma.product.findMany({ where: { slug: { in: ["kirana-tas-selempang-kotak", "aurelia-dompet-panjang-lipat", "tari-ransel-mini", "mila-card-holder-mini"] } } });
  await prisma.flashSale.create({
    data: {
      name: "Flash Sale Akhir Pekan",
      startsAt: new Date(Date.now() - DAY),
      endsAt: new Date(Date.now() + 3 * DAY),
      items: { create: flashProducts.map((p) => ({ productId: p.id, salePrice: Math.round((p.price * 0.85) / 1000) * 1000, quota: 20 })) },
    },
  });

  await prisma.testimonial.createMany({ data: testimonials.map((t, i) => ({ ...t, sortOrder: i })) });

  await prisma.coupon.upsert({
    where: { code: "ZELBARU" },
    update: {},
    create: { code: "ZELBARU", description: "Diskon 10% untuk pembelian pertama, maks. Rp 30.000", type: "PERCENT", value: 10, maxDiscount: 30000, minPurchase: 100000, quota: 500, startsAt: new Date(), endsAt: new Date(Date.now() + 90 * DAY) },
  });
  await prisma.coupon.upsert({
    where: { code: "GRATISONGKIR" },
    update: {},
    create: { code: "GRATISONGKIR", description: "Gratis ongkir maks. Rp 20.000, min. belanja Rp 200.000", type: "FREE_SHIPPING", value: 0, maxDiscount: 20000, minPurchase: 200000, quota: 1000, perUserLimit: 3, startsAt: new Date(), endsAt: new Date(Date.now() + 90 * DAY) },
  });

  for (const page of pages) {
    await prisma.page.upsert({ where: { slug: page.slug }, update: page, create: page });
  }

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      tagline: "Dompet & Tas Wanita",
      email: "halo@zelshop.id",
      whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6281234567890",
      address: "Jl. Contoh No. 1, Bandung, Jawa Barat",
      originCity: "Bandung",
      originPostalCode: "40111",
      freeShippingMin: 300000,
      freeShippingMax: 20000,
      instagramUrl: "https://instagram.com/zelshop.id",
      tiktokUrl: "https://tiktok.com/@zelshop.id",
    },
  });

  await seedOwner();
  console.log("✔ Seed selesai");
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@zelshop.test";
  const password = process.env.SEED_OWNER_PASSWORD ?? "ZelShop#2026";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: "Pemilik Zel Shop",
      email,
      emailVerified: true,
      role: "OWNER",
      accounts: { create: { id: crypto.randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.log(`✔ Akun owner: ${email} (ubah kata sandi setelah login pertama)`);
}

async function seedReviews() {
  const buyers = [
    { name: "Rani Anggraini", email: "rani@contoh.test" },
    { name: "Dewi Kartika", email: "dewi@contoh.test" },
    { name: "Putri Salsabila", email: "putri@contoh.test" },
  ];
  const texts = [
    [5, "Bahannya bagus, jahitan rapi. Warnanya cantik sesuai foto."],
    [5, "Suka banget! Ukurannya pas dan muat banyak."],
    [4, "Kualitas oke untuk harganya, pengiriman cepat."],
  ] as const;
  const users = [];
  for (const b of buyers) {
    users.push(
      await prisma.user.upsert({ where: { email: b.email }, update: {}, create: { id: crypto.randomUUID(), name: b.name, email: b.email, emailVerified: true } }),
    );
  }
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "ZEL-SEED-" } } });

  const all = await prisma.product.findMany({ include: { variants: { take: 1 } } });
  let n = 0;
  for (const product of all) {
    const reviewers = users.slice(0, (n % 3) + 1);
    let sum = 0;
    for (const [i, u] of reviewers.entries()) {
      const v = product.variants[0];
      const [rating, body] = texts[(n + i) % texts.length];
      const order = await prisma.order.create({
        data: {
          orderNumber: `ZEL-SEED-${String(++n).padStart(4, "0")}`,
          userId: u.id,
          email: u.email,
          customerName: u.name,
          phone: "081200000000",
          accessToken: crypto.randomUUID(),
          status: "COMPLETED",
          recipientName: u.name,
          province: "Jawa Barat",
          city: "Bandung",
          district: "Coblong",
          postalCode: "40132",
          street: "Jl. Contoh",
          courierCode: "jne",
          courierService: "REG",
          totalWeightGram: product.weightGram,
          subtotal: product.price,
          shippingCost: 12000,
          total: product.price + 12000,
          paidAt: new Date(),
          completedAt: new Date(),
          items: { create: { productId: product.id, variantId: v.id, productName: product.name, colorName: v.colorName, sku: v.sku, unitPrice: product.price, quantity: 1, weightGram: product.weightGram } },
        },
        include: { items: true },
      });
      await prisma.review.create({ data: { productId: product.id, userId: u.id, orderItemId: order.items[0].id, rating, body, status: "APPROVED" } });
      sum += rating;
    }
    await prisma.product.update({ where: { id: product.id }, data: { ratingAvg: sum / reviewers.length, ratingCount: reviewers.length } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
