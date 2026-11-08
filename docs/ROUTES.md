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
| `/pesanan/[orderNumber]?token=` | Status pesanan, bayar via Midtrans, cek status, batalkan, lacak resi, "pesanan diterima", tulis ulasan | ✅ |

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

## Server Actions (`src/actions/`)
| File | Fungsi |
|---|---|
| `cart.ts` | `addToCart`, `updateCartItem`, `removeCartItem` — validasi stok di server |
| `wishlist.ts` | `toggleWishlist`, `moveWishlistToCart`, `setWishlistNotify` |
| `address.ts` | `saveAddress`, `deleteAddress`, `setDefaultAddress` |
| `checkout.ts` | `findAreas`, `getShippingOptions`, `previewTotals`, `placeOrder` |
| `order.ts` | `startPayment` (Snap), `syncPayment`, `cancelMyOrder`, `confirmReceived`, `submitReview`, `simulatePayment` (hanya lokal) |

`placeOrder` menghitung ulang semua harga, ongkir (memanggil ulang Biteship), dan kupon di server; memotong stok secara atomik (`stock >= qty`) dalam satu transaksi bersama kuota kupon, pembuatan pesanan, dan pengosongan keranjang.

## Siklus status pesanan
```
PENDING_PAYMENT ──bayar (webhook/cek status)──▶ PAID ──admin──▶ PROCESSING ──input resi──▶ SHIPPED ──pembeli/admin──▶ COMPLETED
       │
       └─ batas waktu habis (cron / dibuka) · dibatalkan pembeli · Midtrans "expire"/"cancel" ──▶ CANCELLED (stok & kupon dikembalikan)
```
Pembayaran yang masuk setelah pesanan dibatalkan dicatat di riwayat dan admin diberi tahu via WhatsApp (proses ulang atau refund manual).
