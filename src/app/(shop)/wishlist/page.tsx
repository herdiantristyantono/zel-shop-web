import Link from "next/link";

// Placeholder — diimplementasikan di Tahap 2 (keranjang, wishlist & checkout).
export default function Page() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-4xl">Wishlist</h1>
      <p className="mt-3 text-muted">Fitur ini sedang disiapkan.</p>
      <Link href="/produk" className="btn-primary mt-6">Lanjut belanja</Link>
    </div>
  );
}
