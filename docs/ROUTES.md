# Pages & Routes

Status: ✅ done · 🔜 next phase

Route paths and query parameters are in Indonesian because they are the store's public URLs.

## Storefront (visitors & buyers)
| Route | Page | Status |
|---|---|---|
| `/` | Home: promo banners, categories, flash sale + countdown, newest, best sellers, testimonials | ✅ |
| `/produk` | All products + search (`?q=`), filters, sorting, pagination | ✅ |
| `/kategori/[slug]` | Products per category (same filters & sorting) | ✅ |
| `/produk/[slug]` | Product detail: gallery (swipe, zoom), color variants, stock, specifications, reviews, related products, JSON-LD | ✅ |
| `/promo` | Active coupons, flash sales, discounted products | ✅ |
| `/info/[slug]` | tentang-kami (about us), cara-belanja (how to shop), kebijakan-pengembalian (return policy), syarat-ketentuan (terms), kebijakan-privasi (privacy policy), faq, kontak (contact) | ✅ |
| `/masuk`, `/daftar` | Sign in & sign up (email/password + Google) | ✅ |
| `/lupa-password`, `/reset-password` | Password reset via email | ✅ |
| `/akun` | Account overview | ✅ |
| `/akun/pesanan` | Order history (details at `/pesanan/[orderNumber]`) | ✅ |
| `/akun/alamat` | Address book (add/edit/delete/default address, Biteship district search) | ✅ |
| `/wishlist` | Wishlist: move to cart, discount/stock notification preferences | ✅ (notification delivery: P4) |
| `/keranjang` | Cart: change quantity, remove, real-time stock validation, free-shipping progress | ✅ |
| `/checkout` | Address → Shipping (Biteship rates) → Payment (coupon, method) → place order | ✅ |
| `/pesanan/[orderNumber]?token=` | Order status, pay via Midtrans, check status, cancel, track waybill, "order received", write a review + photos (max. 3) | ✅ |

### `/produk` filter parameters
`q` · `kategori=a,b` (categories) · `min` · `max` · `warna=Hitam,Krem` (colors) · `ukuran=MINI,SMALL,MEDIUM,LARGE` (sizes) · `bahan=kulit-sintetis,kulit-asli,kanvas,satin,nilon` (materials) · `rating=4` · `diskon=1` (discounted) · `sort=terbaru|terlaris|termurah|termahal|rating` (newest, best selling, cheapest, most expensive, rating) · `page`

## API
| Route | Purpose | Status |
|---|---|---|
| `/api/auth/*` | Better Auth (sign in, sign up, Google OAuth, password reset, session) | ✅ |
| `/api/search?q=` | Search autocomplete | ✅ |
| Server Actions `findAreas`, `getShippingOptions` | Area lookup & shipping rate calculation (Biteship) | ✅ |
| `/api/me/wishlist` | Product IDs in the user's wishlist (heart button state) | ✅ |
| `/api/webhooks/midtrans` | Midtrans notifications: verify signature → re-check status via API → match amount → update status | ✅ |
| `/api/cron/expire-orders` | Cancel expired orders, restore stock & coupon quota (header `Authorization: Bearer CRON_SECRET`) | ✅ |

## SEO
`/sitemap.xml` ✅ · `/robots.txt` ✅ · metadata & Open Graph per product/category ✅ · schema.org `Product` + `AggregateRating` + `Review` ✅

## Admin dashboard ✅
Access is checked on the server for every page **and** every Server Action/endpoint (the role is read from the database, not the session cache).

| Route | Contents | Roles |
|---|---|---|
| `/admin` | Sales today/7/30 days, revenue chart, orders by status, best sellers, low stock, latest orders | All staff (sales figures Owner/Admin only) |
| `/admin/produk`, `/admin/produk/baru`, `/admin/produk/[id]` | Create/edit/delete products, multiple photos (drag & drop, reorder, primary photo, photos per color), variants + SKU + stock, compare-at price, SEO, visible/hidden | Owner, Admin |
| `/admin/stok` | Stock adjustments (incoming/returns/adjustments), low/out of stock, history, CSV import/export | All staff (Staff: stock column only on import) |
| `/admin/pesanan`, `/admin/pesanan/[id]` | Filter by status/date/search, process → ship (waybill) → complete, internal notes, history | All staff (cancel: Owner/Admin) |
| `/admin/pesanan/[id]/invoice`, `/label` | A4 invoice & 10×15 cm shipping label — print / save as PDF | All staff |
| `/admin/pelanggan` | Customers, order count, total spend | Owner, Admin |
| `/admin/promo` | Coupons (percentage/fixed/free shipping, min. spend, quota, period), flash sales (price & quota per product), scheduled banners | Owner, Admin |
| `/admin/ulasan` | Approve / hide / reply; product ratings are recalculated automatically | Owner, Admin |
| `/admin/laporan` | Custom period, per day/month, per category, per product; CSV (Excel) export & PDF print | Owner, Admin |
| `/admin/pengaturan` | Store info, WhatsApp, origin address, active couriers, free shipping, payment methods & deadline, social media, policy page editor, admin team | Owner |
| `/api/admin/upload` | Local upload → WebP (development only, without Cloudinary) | Owner, Admin |
| `/api/reviews/upload?item=` | Local review photo upload → WebP (development only); only the owner of a completed, not-yet-reviewed order item | Buyer |
| `/api/admin/products.csv`, `/api/admin/report.csv` | CSV export | Staff+ / Owner, Admin |

## Server Actions (`src/actions/`)
| File | Functions |
|---|---|
| `cart.ts` | `addToCart`, `updateCartItem`, `removeCartItem` — server-side stock validation |
| `wishlist.ts` | `toggleWishlist`, `moveWishlistToCart`, `setWishlistNotify` |
| `address.ts` | `saveAddress`, `deleteAddress`, `setDefaultAddress` |
| `checkout.ts` | `findAreas`, `getShippingOptions`, `previewTotals`, `placeOrder` |
| `admin/*.ts` | products, stock (adjust & CSV import), orders, promo, reviews, settings, upload — all through `adminAction(perm, …)` |
| `order.ts` | `startPayment` (Snap), `syncPayment`, `cancelMyOrder`, `confirmReceived`, `submitReview` (+ photos), `getReviewUploadTarget`, `simulatePayment` (local only) |

`placeOrder` recalculates all prices, shipping (calling Biteship again), and coupons on the server; it deducts stock atomically (`stock >= qty`) in a single transaction together with the coupon quota, order creation, and emptying the cart.

## Order status lifecycle
```
PENDING_PAYMENT ──paid (webhook/status check)──▶ PAID ──admin──▶ PROCESSING ──waybill entered──▶ SHIPPED ──buyer/admin──▶ COMPLETED
       │
       └─ deadline passed (cron / page opened) · cancelled by buyer · Midtrans "expire"/"cancel" ──▶ CANCELLED (stock & coupon restored)
```
Payments that arrive after an order has been cancelled are recorded in the history and the admin is notified via WhatsApp (reprocess or refund manually).
