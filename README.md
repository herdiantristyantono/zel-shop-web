# Zel Shop — Toko Online Dompet & Tas Wanita

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Better Auth

| Dokumen | Isi |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Rancangan tabel & relasi (ERD) |
| [docs/ROUTES.md](docs/ROUTES.md) | Daftar halaman, API, dan status per tahap |
| [.env.example](.env.example) | Semua variabel lingkungan & cara mendapatkannya |

## Status pengerjaan

- [x] **Tahap 1 — Fondasi:** skema database lengkap, auth (email/password, Google, reset password, rate limit), katalog (beranda, kategori, pencarian + autocomplete, filter, sortir, detail produk, promo, halaman info), SEO, data contoh 14 produk
- [ ] **Tahap 2 — Keranjang & checkout:** keranjang (tamu + sinkron saat login), wishlist, buku alamat, checkout 3 langkah, kupon
- [ ] **Tahap 3 — Pembayaran & ongkir:** payment gateway + webhook, ongkir per kurir, lacak resi, batas waktu bayar & pembatalan otomatis, email/WhatsApp
- [ ] **Tahap 4 — Dashboard admin**

## Struktur folder

```
prisma/
  schema.prisma          # skema database (semua tahap)
  migrations/            # riwayat migrasi SQL
  seed.ts                # isi data contoh
  seed-data.ts           # 7 kategori, 14 produk, varian, testimoni
  seed-pages.ts          # konten halaman kebijakan/FAQ
scripts/
  generate-product-images.ts   # ilustrasi SVG placeholder foto produk
public/images/           # gambar placeholder (produk, kategori, banner)
src/
  app/
    (shop)/              # semua halaman toko (header + footer)
      page.tsx           # beranda
      produk/            # daftar & detail produk
      kategori/[slug]/
      promo/  info/[slug]/
      masuk/  daftar/  lupa-password/  reset-password/  akun/
    api/auth/[...all]/   # endpoint Better Auth
    api/search/          # autocomplete
    sitemap.ts  robots.ts  layout.tsx  globals.css
  components/            # UI (Header, ProductCard, galeri, filter, form auth, dll.)
  lib/
    prisma.ts            # Prisma client
    auth.ts              # konfigurasi Better Auth (server)
    auth-client.ts       # hook auth (client)
    catalog.ts           # query katalog + cache
    email.ts  format.ts  site.ts
  generated/prisma/      # hasil `prisma generate` (tidak di-commit)
```

## Menjalankan di komputer lokal

Prasyarat: **Node.js 20+** (disarankan 22 LTS).

```bash
npm install
```

```bash
cp .env.example .env
```

Jalankan database Postgres lokal (tanpa Docker — memakai Prisma Postgres lokal). Biarkan terminal ini tetap terbuka, lalu salin URL `postgres://…` yang muncul ke `DATABASE_URL` di `.env` (biarkan `DATABASE_POOL_MAX=1`):

```bash
npm run db:local
```

Di terminal lain, buat tabel dan isi data contoh:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Buka http://localhost:3000.

**Akun owner contoh:** `owner@zelshop.test` / `ZelShop#2026` (atur lewat `SEED_OWNER_EMAIL` dan `SEED_OWNER_PASSWORD`). Ganti kata sandi sebelum produksi.

> Saat `RESEND_API_KEY` kosong, email (mis. tautan reset kata sandi) dicetak di terminal `npm run dev`.

Perintah lain: `npm run db:studio` (lihat isi database), `npm run typecheck`, `npm run lint`, `npm run images:generate`.

## Konfigurasi layanan

### Google Login
1. [console.cloud.google.com](https://console.cloud.google.com) → buat project → **APIs & Services → OAuth consent screen** (External, isi nama toko & logo).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` dan `https://domainanda.com/api/auth/callback/google`.
4. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`. Tombol Google muncul otomatis.

### Email (Resend)
1. Daftar di [resend.com](https://resend.com), **Domains → Add domain**, tambahkan record DNS (SPF/DKIM) di pengelola domain.
2. Buat API key → isi `RESEND_API_KEY`, set `EMAIL_FROM="Zel Shop <no-reply@domainanda.com>"`.

### Database produksi (Supabase)
1. Buat project di [supabase.com](https://supabase.com) (region **Singapore** paling dekat ke Indonesia).
2. **Project Settings → Database → Connection string**:
   - Untuk aplikasi (Vercel): *Transaction pooler* (port 6543) → `DATABASE_URL`. Set `DATABASE_POOL_MAX=5`.
   - Untuk migrasi dari komputer Anda: *Session/Direct* (port 5432).
3. Jalankan migrasi & seed ke Supabase (sekali, dari komputer Anda), dengan `DATABASE_URL` diarahkan ke koneksi direct:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

## Deploy ke Vercel dengan domain sendiri

1. Push repo ke GitHub, lalu di [vercel.com](https://vercel.com) → **Add New → Project** → import repo.
2. **Environment Variables:** isi semua variabel dari `.env.example` (gunakan nilai produksi). Penting:
   - `NEXT_PUBLIC_SITE_URL` dan `BETTER_AUTH_URL` = `https://domainanda.com`
   - `BETTER_AUTH_SECRET` = hasil `openssl rand -base64 32`
3. Deploy. Build menjalankan `prisma generate && next build` dan membaca database untuk pra-render halaman, jadi pastikan `DATABASE_URL` sudah benar.
4. **Domain:** Project → **Settings → Domains → Add** `domainanda.com` dan `www.domainanda.com`. Di pengelola domain (Niagahoster, Rumahweb, Cloudflare, dll.) tambahkan:
   - `A` record `@` → `76.76.21.21`
   - `CNAME` record `www` → `cname.vercel-dns.com`
   SSL/HTTPS dibuat otomatis oleh Vercel dalam beberapa menit.
5. Daftarkan sitemap di Google Search Console: `https://domainanda.com/sitemap.xml`.

### Alternatif: VPS (Ubuntu)
Instal Node 22 + PostgreSQL (atau pakai Supabase), lalu `npm ci && npx prisma migrate deploy && npm run build`, jalankan `npm start` dengan **PM2**, pasang **Nginx** sebagai reverse proxy ke port 3000, dan **Certbot** (`certbot --nginx -d domainanda.com`) untuk SSL gratis.

## Catatan teknis
- **Cache:** data katalog di-cache dengan `"use cache"` + `cacheTag`. Dashboard admin (Tahap 4) memanggil `revalidateTag("products")` dsb. setelah mengubah data, sehingga perubahan langsung tampil.
- **Keamanan:** password di-hash (scrypt) oleh Better Auth; cookie sesi httpOnly + Secure di produksi; proteksi CSRF bawaan Better Auth (cek Origin); rate limit login 5×/menit, daftar 5×/menit, reset 3×/5 menit; semua parameter URL divalidasi di server; React meng-escape output (JSON-LD di-escape manual); redirect setelah login hanya ke path internal.
- **Gambar produk:** saat ini ilustrasi SVG placeholder di `public/images`. Di Tahap 4, upload admin disimpan ke Cloudinary (kompresi & WebP otomatis) dan URL-nya disimpan di `ProductImage.url`.
