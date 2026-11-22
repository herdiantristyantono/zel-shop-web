/**
 * Versi halaman informasi untuk CHECKOUT_MODE=whatsapp (ongkir & pembayaran diatur admin via WhatsApp).
 *
 * Saat mode WhatsApp aktif, /info/<slug> menampilkan (urutan prioritas):
 *   1. halaman di database dengan slug `<slug>--whatsapp` (hasil edit admin), lalu
 *   2. teks bawaan di file ini, lalu
 *   3. halaman biasa `<slug>` (untuk halaman yang isinya sama di kedua mode).
 * Halaman biasa tidak diubah, jadi kembali dipakai saat flag dimatikan.
 */
export const WHATSAPP_PAGE_SUFFIX = "--whatsapp";

export const whatsappPageSlug = (slug: string) => `${slug}${WHATSAPP_PAGE_SUFFIX}`;
export const isWhatsAppPageSlug = (slug: string) => slug.endsWith(WHATSAPP_PAGE_SUFFIX);

type PageContent = { title: string; summary: string; content: string };

export const whatsappPageDefaults: Record<string, PageContent> = {
  "cara-belanja": {
    title: "Cara Belanja",
    summary: "Belanja di Zel Shop hanya butuh beberapa langkah. Ongkir dan pembayaran dikonfirmasi admin lewat WhatsApp.",
    content: `## 1. Pilih produk
Jelajahi kategori atau gunakan pencarian. Pilih warna, lalu tekan **Tambah ke Keranjang**.

## 2. Checkout
Buka keranjang dan tekan **Checkout**. Anda bisa masuk ke akun atau lanjut sebagai tamu.

## 3. Isi alamat & buat pesanan
Isi nama penerima, nomor WhatsApp, dan alamat lengkap (jalan, nomor, RT/RW, kelurahan, kecamatan, kota, kode pos), lalu tekan **Buat pesanan**. Stok langsung kami amankan untuk Anda.

## 4. Konfirmasi via WhatsApp
Tekan **Konfirmasi via WhatsApp** di halaman pesanan untuk mengirim rincian pesanan ke admin. Admin akan menginformasikan **ongkir** dan **cara pembayaran**.

## 5. Pembayaran
Bayar lewat transfer bank, QRIS, atau e-wallet sesuai info dari admin, lalu kirim bukti bayar di chat yang sama. Pesanan diproses setelah pembayaran kami terima.

## 6. Pengiriman & lacak pesanan
Setelah paket dikirim, nomor resi tampil di halaman pesanan dan menu **Akun → Pesanan**.`,
  },
  faq: {
    title: "Pertanyaan yang Sering Diajukan",
    summary: "Jawaban cepat untuk pertanyaan umum.",
    content: `## Apakah foto produk sesuai aslinya?
Ya. Perbedaan warna tipis bisa terjadi karena pengaturan layar.

## Bagaimana cara memesan?
Buat pesanan di website, lalu tekan **Konfirmasi via WhatsApp**. Admin akan membalas dengan ongkir dan cara pembayaran. Lihat [Cara Belanja](/info/cara-belanja).

## Berapa ongkirnya?
Ongkir dihitung admin sesuai alamat dan berat paket, lalu diinformasikan lewat WhatsApp sebelum Anda membayar.

## Metode pembayaran apa saja?
Transfer bank, QRIS, dan e-wallet. Rincian pembayaran dikirim admin melalui WhatsApp setelah Anda mengonfirmasi pesanan.

## Berapa lama pengiriman?
Pesanan dikirim 1×24 jam hari kerja setelah pembayaran dikonfirmasi. Estimasi tiba tergantung kurir dan kota tujuan.

## Bisakah belanja tanpa membuat akun?
Bisa. Pilih **Checkout sebagai tamu**. Membuat akun memudahkan lacak pesanan, menyimpan alamat, dan memberi ulasan.

## Bagaimana jika barang rusak?
Lihat [Kebijakan Pengembalian](/info/kebijakan-pengembalian). Jangan lupa rekam video unboxing.

## Apakah bisa COD?
Silakan tanyakan ke admin saat konfirmasi pesanan lewat WhatsApp.`,
  },
  "syarat-ketentuan": {
    title: "Syarat & Ketentuan",
    summary: "Ketentuan penggunaan situs dan transaksi di Zel Shop.",
    content: `Dengan menggunakan situs Zel Shop, Anda menyetujui ketentuan berikut.

## Akun
Anda bertanggung jawab menjaga kerahasiaan kata sandi. Kami berhak menonaktifkan akun yang terindikasi penipuan.

## Pemesanan
Pesanan dibuat di website lalu dikonfirmasi ke admin lewat WhatsApp. Stok diamankan saat pesanan dibuat. Pesanan yang tidak dikonfirmasi atau tidak dibayar dalam waktu wajar dapat dibatalkan oleh admin.

## Harga & ongkir
Harga dalam Rupiah dan dapat berubah sewaktu-waktu. Ongkir belum termasuk dalam total pesanan dan diinformasikan admin sebelum pembayaran.

## Pembayaran
Pembayaran dilakukan sesuai instruksi admin (transfer bank, QRIS, atau e-wallet). Pesanan diproses setelah pembayaran kami terima.

## Pengiriman
Kurir dan ongkir disepakati bersama admin. Estimasi waktu kirim berasal dari kurir dan dapat berbeda karena kondisi di luar kendali kami.

## Promo
Kode kupon tidak dapat diuangkan, memiliki masa berlaku, kuota, dan syarat minimum belanja.`,
  },
  "kebijakan-privasi": {
    title: "Kebijakan Privasi",
    summary: "Bagaimana kami mengelola data pribadi Anda sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.",
    content: `## Data yang kami kumpulkan
Nama, email, nomor telepon/WhatsApp, alamat pengiriman, dan riwayat pesanan.

## Tujuan penggunaan
- Memproses dan mengirim pesanan.
- Menghubungi Anda lewat WhatsApp untuk konfirmasi ongkir, pembayaran, dan status pesanan.
- Meningkatkan layanan (analitik anonim).

## Pihak ketiga
Data dibagikan seperlunya kepada kurir untuk mengirim pesanan. Percakapan konfirmasi pesanan berlangsung di WhatsApp. Kami **tidak menjual** data Anda.

## Keamanan
Kata sandi disimpan dalam bentuk hash dan seluruh koneksi menggunakan HTTPS. Kami tidak pernah meminta data kartu kredit, PIN, atau kode OTP Anda.

## Hak Anda
Anda berhak mengakses, memperbaiki, dan meminta penghapusan data pribadi. Hubungi kami melalui halaman Kontak.

## Cookie
Kami memakai cookie untuk sesi login, keranjang, serta analitik (Google Analytics & Meta Pixel).`,
  },
  kontak: {
    title: "Kontak",
    summary: "Kami senang mendengar dari Anda.",
    content: `## WhatsApp
Chat admin lewat tombol WhatsApp di pojok kanan bawah. Konfirmasi pesanan, tanya ongkir, dan pembayaran semuanya dilayani lewat WhatsApp.

Jam layanan: Senin–Sabtu, 09.00–17.00 WIB.`,
  },
};
