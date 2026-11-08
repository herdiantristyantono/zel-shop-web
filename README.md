# Zel Shop — Toko Online Dompet & Tas Wanita

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Better Auth

| Dokumen | Isi |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Rancangan tabel & relasi (ERD) |
| [docs/ROUTES.md](docs/ROUTES.md) | Daftar halaman, API, dan status per tahap |
| [.env.example](.env.example) | Semua variabel lingkungan & cara mendapatkannya |

## Status pengerjaan

- [x] **Tahap 1 — Fondasi:** skema database lengkap, auth (email/password, Google, reset password, rate limit), katalog (beranda, kategori, pencarian + autocomplete, filter, sortir, detail produk, promo, halaman info), SEO, data contoh 14 produk
- [x] **Tahap 2 — Keranjang & checkout:** keranjang (tamu + digabung saat login, validasi stok realtime), wishlist, buku alamat, checkout 3 langkah dengan ongkir **Biteship**, kupon & gratis ongkir, pemotongan stok atomik, halaman status pesanan (juga untuk tamu), riwayat pesanan, email konfirmasi
- [x] **Tahap 3 — Pembayaran & pengiriman:** **Midtrans** Snap + webhook terverifikasi, batas waktu bayar & pembatalan otomatis (stok & kupon kembali), lacak resi Biteship, "pesanan diterima", ulasan pembeli terverifikasi, notifikasi email + WhatsApp (Fonnte)
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
      masuk/  daftar/  lupa-password/  reset-password/
      keranjang/  checkout/  pesanan/[orderNumber]/  wishlist/
      akun/  akun/alamat/  akun/pesanan/
    api/auth/[...all]/   # endpoint Better Auth
    api/search/          # autocomplete
    api/webhooks/midtrans/  api/cron/expire-orders/
    sitemap.ts  robots.ts  layout.tsx  globals.css
  actions/               # Server Actions: cart, wishlist, address, checkout, order
  components/            # UI (Header, ProductCard, galeri, filter, form auth, dll.)
  lib/
    prisma.ts            # Prisma client
    auth.ts              # konfigurasi Better Auth (server)
    auth-client.ts       # hook auth (client)
    catalog.ts           # query katalog + cache
    cart.ts  pricing.ts  coupon.ts  shipping.ts (Biteship)  orders.ts  settings.ts  validation.ts
    midtrans.ts  payments.ts  order-service.ts (transisi status)  notify.ts  whatsapp.ts
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

### Ongkir (Biteship)
Tanpa `BITESHIP_API_KEY`, checkout memakai daftar wilayah & tarif **contoh** (ditandai "Mode contoh" di halaman checkout) — cukup untuk mencoba alur lokal.
1. Daftar di [biteship.com](https://biteship.com), buka **Dashboard → Integrasi/API** dan salin API key (mulai dengan key *testing*).
2. Isi `BITESHIP_API_KEY`.
3. Cari ID area alamat gudang (asal kirim) lalu isi `BITESHIP_ORIGIN_AREA_ID`:

```bash
curl -H "Authorization: $BITESHIP_API_KEY" "https://api.biteship.com/v1/maps/areas?countries=ID&type=single&input=40111"
```

4. Kurir aktif diatur di tabel `StoreSettings.activeCouriers` (default: jne, jnt, sicepat, anteraja, pos); di Tahap 4 bisa diubah dari dashboard.

### Pembayaran (Midtrans)
Tanpa `MIDTRANS_SERVER_KEY`, halaman pesanan menampilkan tombol **"Simulasikan pembayaran berhasil"** (hanya di lokal) untuk menguji alur.
1. Daftar di [midtrans.com](https://midtrans.com). Mulai dari **Sandbox**: [dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com) → **Settings → Access Keys** → isi `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION="false"`.
2. **Settings → Configuration**:
   - *Payment Notification URL*: `https://domainanda.com/api/webhooks/midtrans`
   - *Finish/Unfinish/Error Redirect URL*: `https://domainanda.com/akun/pesanan` (pembeli juga otomatis diarahkan kembali ke halaman pesanannya)
3. Aktifkan metode pembayaran (QRIS, VA, GoPay, ShopeePay, kartu kredit) di **Settings → Payment**. Metode yang ditawarkan di checkout diatur di `StoreSettings.paymentMethods`.
4. Uji webhook di lokal dengan tunnel, mis. `ngrok http 3000`, lalu pakai URL ngrok sebagai Notification URL sandbox. Simulator pembayaran sandbox: [simulator.sandbox.midtrans.com](https://simulator.sandbox.midtrans.com).
5. Setelah verifikasi akun & go-live: ganti ke kunci produksi dan `MIDTRANS_IS_PRODUCTION="true"`.

**Keamanan webhook:** signature SHA512 diverifikasi (constant-time), status diambil ulang dari API Midtrans, nominal dicocokkan dengan total pesanan, dan perubahan status idempoten (notifikasi ganda aman).

### Pembatalan otomatis (cron)
`vercel.json` menjadwalkan `/api/cron/expire-orders` tiap 15 menit — isi `CRON_SECRET` di Vercel. **Catatan:** paket Vercel Hobby hanya mengizinkan cron 1×/hari; pada paket Hobby gunakan layanan gratis seperti [cron-job.org](https://cron-job.org) untuk memanggil URL tersebut tiap 15 menit dengan header `Authorization: Bearer <CRON_SECRET>`. Pesanan kedaluwarsa juga dibatalkan saat halamannya dibuka.

### WhatsApp (Fonnte)
Daftar di [fonnte.com](https://fonnte.com), hubungkan nomor WhatsApp toko (scan QR), salin token device ke `WHATSAPP_API_TOKEN`. Pesan otomatis: pesanan dibuat, pembayaran diterima, dibatalkan, dan dikirim (dengan resi). Admin menerima notifikasi pesanan dibayar di nomor `StoreSettings.whatsappNumber`. Gateway lain bisa dipakai dengan menyesuaikan `src/lib/whatsapp.ts`.

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
