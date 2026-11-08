# Daftar Halaman & Route

Status: ✅ selesai · 🔜 tahap berikutnya

## Toko (pengunjung & pembeli)
| Route | Halaman | Status |
|---|---|---|
| `/` | Beranda: banner promo, kategori, flash sale + hitung mundur, terbaru, terlaris, testimoni | ✅ |
| `/produk` | Semua produk + pencarian (`?q=`), filter, sortir, paginasi | ✅ |
| `/kategori/[slug]` | Produk per kategori (filter & sortir sama) | ✅ |
| `/produk/[slug]` | Detail produk: galeri (swipe, zoom), varian warna, stok, spesifikasi, ulasan, produk terkait, JSON-LD | ✅ |
| `/promo` | Kupon aktif, flash sale, produk diskon | ✅ |
| `/info/[slug]` | tentang-kami, cara-belanja, kebijakan-pengembalian, syarat-ketentuan, kebijakan-privasi, faq, kontak | ✅ |
| `/masuk`, `/daftar` | Login & daftar (email/password + Google) | ✅ |
| `/lupa-password`, `/reset-password` | Reset kata sandi via email | ✅ |
| `/akun` | Ringkasan akun | ✅ |
| `/akun/pesanan` | Riwayat pesanan (detail di `/pesanan/[orderNumber]`) | ✅ |
| `/akun/alamat` | Buku alamat (tambah/ubah/hapus/alamat utama, pencarian kecamatan Biteship) | ✅ |
| `/wishlist` | Wishlist: pindah ke keranjang, preferensi notifikasi diskon/stok | ✅ (pengiriman notifikasi: T4) |
| `/keranjang` | Keranjang: ubah jumlah, hapus, validasi stok realtime, progres gratis ongkir | ✅ |
| `/checkout` | Alamat → Pengiriman (ongkir Biteship) → Pembayaran (kupon, metode) → buat pesanan | ✅ |
| `/pesanan/[orderNumber]?token=` | Status pesanan, bayar via Midtrans, cek status, batalkan, lacak resi, "pesanan diterima", tulis ulasan + foto (maks. 3) | ✅ |

### Parameter filter `/produk`
`q` · `kategori=a,b` · `min` · `max` · `warna=Hitam,Krem` · `ukuran=MINI,SMALL,MEDIUM,LARGE` · `bahan=kulit-sintetis,kulit-asli,kanvas,satin,nilon` · `rating=4` · `diskon=1` · `sort=terbaru|terlaris|termurah|termahal|rating` · `page`

## API
| Route | Fungsi | Status |
|---|---|---|
| `/api/auth/*` | Better Auth (login, daftar, Google OAuth, reset password, sesi) | ✅ |
| `/api/search?q=` | Autocomplete pencarian | ✅ |
| Server Actions `findAreas`, `getShippingOptions` | Cari wilayah & hitung ongkir (Biteship) | ✅ |
| `/api/me/wishlist` | ID produk di wishlist user (status tombol hati) | ✅ |
| `/api/webhooks/midtrans` | Notifikasi Midtrans: verifikasi signature → cek ulang status ke API → cocokkan nominal → update status | ✅ |
| `/api/cron/expire-orders` | Batalkan pesanan kedaluwarsa, kembalikan stok & kuota kupon (header `Authorization: Bearer CRON_SECRET`) | ✅ |

## SEO
`/sitemap.xml` ✅ · `/robots.txt` ✅ · metadata & Open Graph per produk/kategori ✅ · schema.org `Product` + `AggregateRating` + `Review` ✅

## Dashboard admin ✅
Akses dicek di server untuk setiap halaman **dan** setiap Server Action/endpoint (peran dibaca dari database, bukan cache sesi).

| Route | Isi | Peran |
|---|---|---|
| `/admin` | Penjualan hari ini/7/30 hari, grafik pendapatan, pesanan per status, terlaris, stok menipis, pesanan terbaru | Semua staf (angka penjualan hanya Owner/Admin) |
| `/admin/produk`, `/admin/produk/baru`, `/admin/produk/[id]` | Tambah/ubah/hapus produk, multi foto (seret-lepas, urutkan, foto utama, foto per warna), varian + SKU + stok, harga coret, SEO, tampil/sembunyi | Owner, Admin |
| `/admin/stok` | Penyesuaian stok (barang masuk/retur/penyesuaian), stok menipis/habis, riwayat, import/export CSV | Semua staf (Staf: kolom stok saja saat import) |
| `/admin/pesanan`, `/admin/pesanan/[id]` | Filter status/tanggal/pencarian, proses → kirim (resi) → selesai, catatan internal, riwayat | Semua staf (batalkan: Owner/Admin) |
| `/admin/pesanan/[id]/invoice`, `/label` | Invoice A4 & label kirim 10×15 cm — cetak / simpan PDF | Semua staf |
| `/admin/pelanggan` | Pelanggan, jumlah pesanan, total belanja | Owner, Admin |
| `/admin/promo` | Kupon (persen/nominal/gratis ongkir, min. belanja, kuota, periode), flash sale (harga & kuota per produk), banner terjadwal | Owner, Admin |
| `/admin/ulasan` | Setujui / sembunyikan / balas; rating produk dihitung ulang otomatis | Owner, Admin |
| `/admin/laporan` | Periode bebas, per hari/bulan, per kategori, per produk; export CSV (Excel) & cetak PDF | Owner, Admin |
| `/admin/pengaturan` | Info toko, WhatsApp, alamat asal kirim, kurir aktif, gratis ongkir, metode & batas bayar, media sosial, editor halaman kebijakan, tim admin | Owner |
| `/api/admin/upload` | Upload lokal → WebP (hanya pengembangan, tanpa Cloudinary) | Owner, Admin |
| `/api/reviews/upload?item=` | Upload lokal foto ulasan → WebP (hanya pengembangan); hanya pemilik item pesanan selesai yang belum diulas | Pembeli |
| `/api/admin/products.csv`, `/api/admin/report.csv` | Export CSV | Staf+ / Owner, Admin |

## Server Actions (`src/actions/`)
| File | Fungsi |
|---|---|
| `cart.ts` | `addToCart`, `updateCartItem`, `removeCartItem` — validasi stok di server |
| `wishlist.ts` | `toggleWishlist`, `moveWishlistToCart`, `setWishlistNotify` |
| `address.ts` | `saveAddress`, `deleteAddress`, `setDefaultAddress` |
| `checkout.ts` | `findAreas`, `getShippingOptions`, `previewTotals`, `placeOrder` |
| `admin/*.ts` | products, stock (adjust & import CSV), orders, promo, reviews, settings, upload — semua lewat `adminAction(perm, …)` |
| `order.ts` | `startPayment` (Snap), `syncPayment`, `cancelMyOrder`, `confirmReceived`, `submitReview` (+ foto), `getReviewUploadTarget`, `simulatePayment` (hanya lokal) |

`placeOrder` menghitung ulang semua harga, ongkir (memanggil ulang Biteship), dan kupon di server; memotong stok secara atomik (`stock >= qty`) dalam satu transaksi bersama kuota kupon, pembuatan pesanan, dan pengosongan keranjang.

## Siklus status pesanan
```
PENDING_PAYMENT ──bayar (webhook/cek status)──▶ PAID ──admin──▶ PROCESSING ──input resi──▶ SHIPPED ──pembeli/admin──▶ COMPLETED
       │
       └─ batas waktu habis (cron / dibuka) · dibatalkan pembeli · Midtrans "expire"/"cancel" ──▶ CANCELLED (stok & kupon dikembalikan)
```
Pembayaran yang masuk setelah pesanan dibatalkan dicatat di riwayat dan admin diberi tahu via WhatsApp (proses ulang atau refund manual).
