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
- [x] **Tahap 4 — Dashboard admin:** peran Owner/Admin/Staf Gudang, ringkasan & grafik, produk + multi foto (Cloudinary) + varian/SKU, stok + riwayat + import/export CSV, pesanan (resi, catatan, invoice & label cetak/PDF), pelanggan, promo (kupon, flash sale, banner), moderasi ulasan, laporan (CSV/PDF), pengaturan toko & tim, notifikasi wishlist, GA4 & Meta Pixel dengan persetujuan cookie
- [x] **Penyempurnaan:** foto pada ulasan pembeli (maks. 3, ikut dimoderasi admin), audit Lighthouse mobile

**Lighthouse (mobile, build produksi lokal, 8 Nov 2026)** — Performa / Aksesibilitas / Best practices / SEO:

| Halaman | Skor |
|---|---|
| Beranda `/` | 93 / 100 / 100 / 100 |
| Semua produk `/produk` | 95 / 100 / 100 / 100 |
| Detail produk | 100 / 100 / 100 / 100 |
| Kategori | 96 / 100 / 100 / 100 |
| Promo | 100 / 100 / 100 / 100 |

Keranjang, checkout, akun, dan admin sengaja `noindex` (skor SEO rendah di sana memang disengaja). Skor di produksi bergantung pada foto asli — unggah lewat Cloudinary agar otomatis dikompres ke WebP/AVIF.

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
    api/webhooks/midtrans/  api/cron/expire-orders/  api/admin/ (upload, CSV)
    admin/               # dashboard admin (layout sendiri, cek peran)
    sitemap.ts  robots.ts  layout.tsx  globals.css
  actions/               # Server Actions: cart, wishlist, address, checkout, order
    admin/               # products, stock, orders, promo, reviews, settings, upload
  components/            # UI toko (Header, ProductCard, galeri, filter, checkout, …)
    admin/               # UI admin (tabel, grafik, form produk, editor promo, …)
  lib/
    prisma.ts            # Prisma client
    auth.ts              # konfigurasi Better Auth (server)
    auth-client.ts       # hook auth (client)
    catalog.ts           # query katalog + cache
    cart.ts  pricing.ts  coupon.ts  shipping.ts (Biteship)  orders.ts  settings.ts  validation.ts
    midtrans.ts  payments.ts  order-service.ts (transisi status)  notify.ts  whatsapp.ts
    admin.ts (peran & izin)  admin-stats.ts  upload.ts  csv.ts  wishlist-notify.ts
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

4. Kurir aktif, alamat asal kirim, dan gratis ongkir diatur di **Admin → Pengaturan**.

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
3. Jalankan migrasi & seed ke Supabase (sekali, dari komputer Anda), dengan `DATABASE_URL` diarahkan ke koneksi direct. **Untuk toko sungguhan set `SEED_DEMO=false`** agar tidak ada produk, ulasan, atau pesanan contoh (ulasan palsu melanggar aturan konsumen & kebijakan Google):

```bash
npx prisma migrate deploy
```

```bash
SEED_DEMO=false SEED_OWNER_EMAIL=emailanda@domain.com SEED_OWNER_PASSWORD='kata-sandi-kuat' npm run db:seed
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

## Dashboard admin

Buka `/admin` dan masuk dengan akun owner. Tambahkan anggota tim di **Pengaturan → Tim admin** (mereka harus mendaftar akun dulu di `/daftar`).

| Peran | Akses |
|---|---|
| **Owner** | Semua, termasuk pengaturan toko & tim |
| **Admin** | Semua kecuali pengaturan |
| **Staf Gudang** | Pesanan (proses, resi, cetak label/invoice, catatan) dan stok; tanpa angka penjualan |

Alur harian: **Pesanan → filter "Dibayar"** → *Proses pesanan* → cetak **label** → input **nomor resi** (pembeli otomatis diberi tahu via email & WhatsApp) → selesai otomatis saat pembeli menekan "diterima", atau tandai manual.

### Foto produk (Cloudinary)
1. Daftar gratis di [cloudinary.com](https://cloudinary.com) → **Dashboard** → salin *Cloud name*, *API Key*, *API Secret* ke `CLOUDINARY_*`.
2. Foto diunggah langsung dari browser ke Cloudinary dengan tanda tangan server (file tidak melewati server Anda), disimpan maks. 2000 px, dan ditampilkan dengan `f_auto,q_auto` → **WebP/AVIF otomatis** sesuai browser.
3. Tanpa Cloudinary (hanya lokal), foto dikompres ke WebP 1600 px dan disimpan di `public/uploads/` (tidak di-commit).

### Import/export produk (Excel)
**Stok → Export CSV** menghasilkan file per varian (pemisah `;`, langsung terbaca Excel berbahasa Indonesia). Ubah kolom `stock`, `price`, `compare_at_price`, `variant_price`, atau `published` (1/0), simpan sebagai CSV, lalu **Import CSV**. Baris dicocokkan lewat `sku`; setiap perubahan stok tercatat di riwayat. Produk baru dibuat lewat form (agar foto & deskripsi lengkap).

### Analitik (GA4 & Meta Pixel)
Isi `NEXT_PUBLIC_GA_ID` dan/atau `NEXT_PUBLIC_META_PIXEL_ID`. Pengunjung melihat pemberitahuan cookie; skrip baru dimuat setelah mereka menekan **Setuju** (sesuai UU PDP). Event yang dikirim: `PageView`, `add_to_cart`/`AddToCart`, `begin_checkout`/`InitiateCheckout`, dan `purchase`/`Purchase` (saat pesanan sudah dibayar).

## Catatan teknis
- **Cache:** data katalog di-cache dengan `"use cache"` + `cacheTag`; dashboard admin memanggil `updateTag(...)` setelah mengubah data sehingga perubahan langsung tampil di toko.
- **Keamanan:** password di-hash (scrypt) oleh Better Auth; cookie sesi httpOnly + Secure di produksi; proteksi CSRF bawaan Better Auth (cek Origin); rate limit login 5×/menit, daftar 5×/menit, reset 3×/5 menit; semua parameter URL divalidasi di server; React meng-escape output (JSON-LD di-escape manual); redirect setelah login hanya ke path internal.
- **Gambar produk:** data contoh memakai ilustrasi SVG di `public/images`; ganti dengan foto asli lewat **Admin → Produk** (Cloudinary).
- **Notifikasi wishlist:** saat harga produk turun / harga coret dipasang, atau stok kembali dari 0, pengguna yang menyimpan produk itu menerima email (+WhatsApp jika ada nomor), maks. 1× per 24 jam per produk.
