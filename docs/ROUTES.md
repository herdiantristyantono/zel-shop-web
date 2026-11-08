# Daftar Halaman & Route

Status: ✅ selesai (Tahap 1) · 🔜 tahap berikutnya

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
| `/akun/pesanan`, `/akun/pesanan/[orderNumber]` | Riwayat & detail pesanan, lacak resi | 🔜 T2/T3 |
| `/akun/alamat` | Buku alamat | 🔜 T2 |
| `/wishlist` | Wishlist | 🔜 T2 |
| `/keranjang` | Keranjang | 🔜 T2 |
| `/checkout` | Alamat → Pengiriman → Pembayaran | 🔜 T2/T3 |
| `/pesanan/[orderNumber]?token=` | Status pesanan tamu | 🔜 T2 |

### Parameter filter `/produk`
`q` · `kategori=a,b` · `min` · `max` · `warna=Hitam,Krem` · `ukuran=MINI,SMALL,MEDIUM,LARGE` · `bahan=kulit-sintetis,kulit-asli,kanvas,satin,nilon` · `rating=4` · `diskon=1` · `sort=terbaru|terlaris|termurah|termahal|rating` · `page`

## API
| Route | Fungsi | Status |
|---|---|---|
| `/api/auth/*` | Better Auth (login, daftar, Google OAuth, reset password, sesi) | ✅ |
| `/api/search?q=` | Autocomplete pencarian | ✅ |
| `/api/shipping/areas`, `/api/shipping/rates` | Cari wilayah & hitung ongkir | 🔜 T3 |
| `/api/webhooks/midtrans` atau `/api/webhooks/xendit` | Update status pembayaran otomatis | 🔜 T3 |
| `/api/cron/expire-orders` | Batalkan pesanan kedaluwarsa & kembalikan stok | 🔜 T3 |

## SEO
`/sitemap.xml` ✅ · `/robots.txt` ✅ · metadata & Open Graph per produk/kategori ✅ · schema.org `Product` + `AggregateRating` + `Review` ✅

## Dashboard admin (🔜 Tahap 4)
| Route | Peran |
|---|---|
| `/admin` | Ringkasan penjualan, grafik, pesanan per status, terlaris, stok menipis | Owner, Admin |
| `/admin/produk`, `/admin/produk/baru`, `/admin/produk/[id]` | CRUD produk, upload multi foto, varian, import/export | Owner, Admin, Staf (stok saja) |
| `/admin/stok` | Riwayat & penyesuaian stok | Semua staf |
| `/admin/pesanan`, `/admin/pesanan/[id]` | Status, resi, label & invoice PDF, catatan | Semua staf |
| `/admin/pelanggan` | Daftar pelanggan | Owner, Admin |
| `/admin/promo` | Kupon, flash sale, banner | Owner, Admin |
| `/admin/ulasan` | Setujui / sembunyikan / balas | Owner, Admin |
| `/admin/laporan` | Laporan per periode/produk/kategori, export Excel/PDF | Owner, Admin |
| `/admin/pengaturan` | Info toko, kurir, pembayaran, halaman kebijakan, akun admin | Owner |
