import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-muted">Produk atau halaman yang Anda cari mungkin sudah dipindahkan.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-primary">Ke Beranda</Link>
        <Link href="/produk" className="btn-outline">Lihat Produk</Link>
      </div>
    </div>
  );
}
