# Zel Shop — Women's Wallets & Bags Online Store

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Better Auth

| Document | Contents |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Table design & relations (ERD) |
| [docs/ROUTES.md](docs/ROUTES.md) | List of pages, APIs, and status per phase |
| [.env.example](.env.example) | All environment variables & how to obtain them |

## Progress

- [x] **Phase 1 — Foundation:** complete database schema, auth (email/password, Google, password reset, rate limiting), catalog (home, categories, search + autocomplete, filters, sorting, product detail, promo, info pages), SEO, sample data with 14 products
- [x] **Phase 2 — Cart & checkout:** cart (guest + merged on login, real-time stock validation), wishlist, address book, 3-step checkout with **Biteship** shipping rates, coupons & free shipping, atomic stock deduction, order status page (also for guests), order history, confirmation email
- [x] **Phase 3 — Payment & shipping:** **Midtrans** Snap + verified webhook, payment deadline & automatic cancellation (stock & coupon restored), Biteship waybill tracking, "order received", verified buyer reviews, email + WhatsApp (Fonnte) notifications
- [x] **Phase 4 — Admin dashboard:** Owner/Admin/Warehouse Staff roles, overview & charts, products + multiple photos (Cloudinary) + variants/SKUs, stock + history + CSV import/export, orders (waybill, notes, printable/PDF invoice & label), customers, promos (coupons, flash sales, banners), review moderation, reports (CSV/PDF), store & team settings, wishlist notifications, GA4 & Meta Pixel with cookie consent
- [x] **Refinements:** photos on buyer reviews (max. 3, moderated by admin), mobile Lighthouse audit

**Lighthouse (mobile, local production build, 8 Nov 2026)** — Performance / Accessibility / Best practices / SEO:

| Page | Score |
|---|---|
| Home `/` | 93 / 100 / 100 / 100 |
| All products `/produk` | 95 / 100 / 100 / 100 |
| Product detail | 100 / 100 / 100 / 100 |
| Category | 96 / 100 / 100 / 100 |
| Promo | 100 / 100 / 100 / 100 |

Cart, checkout, account, and admin pages are intentionally `noindex` (low SEO scores there are expected). Production scores depend on the real photos — upload them via Cloudinary so they are automatically compressed to WebP/AVIF.

## Folder structure

```
prisma/
  schema.prisma          # database schema (all phases)
  migrations/            # SQL migration history
  seed.ts                # sample data seeding
  seed-data.ts           # 7 categories, 14 products, variants, testimonials
  seed-pages.ts          # policy/FAQ page content
scripts/
  generate-product-images.ts   # SVG placeholder illustrations for product photos
public/images/           # placeholder images (products, categories, banners)
src/
  app/
    (shop)/              # all storefront pages (header + footer)
      page.tsx           # home
      produk/            # product list & detail
      kategori/[slug]/
      promo/  info/[slug]/
      masuk/  daftar/  lupa-password/  reset-password/
      keranjang/  checkout/  pesanan/[orderNumber]/  wishlist/
      akun/  akun/alamat/  akun/pesanan/
    api/auth/[...all]/   # Better Auth endpoint
    api/search/          # autocomplete
    api/webhooks/midtrans/  api/cron/expire-orders/  api/admin/ (upload, CSV)
    admin/               # admin dashboard (own layout, role check)
    sitemap.ts  robots.ts  layout.tsx  globals.css
  actions/               # Server Actions: cart, wishlist, address, checkout, order
    admin/               # products, stock, orders, promo, reviews, settings, upload
  components/            # storefront UI (Header, ProductCard, gallery, filters, checkout, …)
    admin/               # admin UI (tables, charts, product form, promo editor, …)
  lib/
    prisma.ts            # Prisma client
    auth.ts              # Better Auth configuration (server)
    auth-client.ts       # auth hooks (client)
    catalog.ts           # catalog queries + cache
    cart.ts  pricing.ts  coupon.ts  shipping.ts (Biteship)  orders.ts  settings.ts  validation.ts
    midtrans.ts  payments.ts  order-service.ts (status transitions)  notify.ts  whatsapp.ts
    admin.ts (roles & permissions)  admin-stats.ts  upload.ts  csv.ts  wishlist-notify.ts
    email.ts  format.ts  site.ts
  generated/prisma/      # `prisma generate` output (not committed)
```

## Running locally

Prerequisite: **Node.js 20+** (22 LTS recommended).

```bash
npm install
```

```bash
cp .env.example .env
```

Start a local Postgres database (no Docker — uses local Prisma Postgres). Keep this terminal open, then copy the `postgres://…` URL it prints into `DATABASE_URL` in `.env` (keep `DATABASE_POOL_MAX=1`):

```bash
npm run db:local
```

In another terminal, create the tables and seed sample data:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000.

**Sample owner account:** `owner@zelshop.test` / `ZelShop#2026` (configure via `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD`). Change the password before going to production.

> When `RESEND_API_KEY` is empty, emails (e.g. password reset links) are printed in the `npm run dev` terminal.

Other commands: `npm run db:studio` (browse the database), `npm run typecheck`, `npm run lint`, `npm run images:generate`.

## Service configuration

### Google Login
1. [console.cloud.google.com](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen** (External, fill in the store name & logo).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://yourdomain.com/api/auth/callback/google`.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The Google button appears automatically.

### Shipping rates (Biteship)
Without `BITESHIP_API_KEY`, checkout uses a **sample** list of areas & rates (marked "Mode contoh" on the checkout page) — enough to try the flow locally.
1. Sign up at [biteship.com](https://biteship.com), open **Dashboard → Integration/API** and copy the API key (start with the *testing* key).
2. Set `BITESHIP_API_KEY`.
3. Look up the area ID of the warehouse (origin) address and set `BITESHIP_ORIGIN_AREA_ID`:

```bash
curl -H "Authorization: $BITESHIP_API_KEY" "https://api.biteship.com/v1/maps/areas?countries=ID&type=single&input=40111"
```

4. Active couriers, origin address, and free shipping are configured in **Admin → Settings**.

### Payment (Midtrans)
Without `MIDTRANS_SERVER_KEY`, the order page shows a **"Simulasikan pembayaran berhasil"** (simulate successful payment) button (local only) to test the flow.
1. Sign up at [midtrans.com](https://midtrans.com). Start with **Sandbox**: [dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com) → **Settings → Access Keys** → set `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION="false"`.
2. **Settings → Configuration**:
   - *Payment Notification URL*: `https://yourdomain.com/api/webhooks/midtrans`
   - *Finish/Unfinish/Error Redirect URL*: `https://yourdomain.com/akun/pesanan` (buyers are also automatically redirected back to their order page)
3. Enable payment methods (QRIS, VA, GoPay, ShopeePay, credit card) in **Settings → Payment**. The methods offered at checkout are configured in `StoreSettings.paymentMethods`.
4. Test the webhook locally with a tunnel, e.g. `ngrok http 3000`, then use the ngrok URL as the sandbox Notification URL. Sandbox payment simulator: [simulator.sandbox.midtrans.com](https://simulator.sandbox.midtrans.com).
5. After account verification & go-live: switch to the production keys and `MIDTRANS_IS_PRODUCTION="true"`.

**Webhook security:** the SHA512 signature is verified (constant-time), the status is re-fetched from the Midtrans API, the amount is matched against the order total, and status changes are idempotent (duplicate notifications are safe).

### Automatic cancellation (cron)
`vercel.json` schedules `/api/cron/expire-orders` once a day (`0 17 * * *` = 00:00 WIB) — set `CRON_SECRET` in Vercel. **Note:** the Vercel Hobby plan only allows cron jobs once per day; for more frequent cancellation, use a free service such as [cron-job.org](https://cron-job.org) to call that URL every 15 minutes with the header `Authorization: Bearer <CRON_SECRET>`. Expired orders are also cancelled when their page is opened.

### WhatsApp (Fonnte)
Sign up at [fonnte.com](https://fonnte.com), connect the store's WhatsApp number (scan the QR code), and copy the device token into `WHATSAPP_API_TOKEN`. Automatic messages: order created, payment received, cancelled, and shipped (with waybill). The admin receives paid-order notifications at the `StoreSettings.whatsappNumber` number. Other gateways can be used by adapting `src/lib/whatsapp.ts`.

### Email (Resend)
1. Sign up at [resend.com](https://resend.com), **Domains → Add domain**, and add the DNS records (SPF/DKIM) at your domain registrar.
2. Create an API key → set `RESEND_API_KEY`, and set `EMAIL_FROM="Zel Shop <no-reply@yourdomain.com>"`.

### Production database (Supabase)
1. Create a project at [supabase.com](https://supabase.com) (the **Singapore** region is closest to Indonesia).
2. **Project Settings → Database → Connection string**:
   - For the app (Vercel): *Transaction pooler* (port 6543) → `DATABASE_URL`. Set `DATABASE_POOL_MAX=5`.
   - For migrations from your computer: *Session/Direct* (port 5432).
3. Run migrations & seed against Supabase (once, from your computer), with `DATABASE_URL` pointing to the direct connection. **For a real store set `SEED_DEMO=false`** so no sample products, reviews, or orders are created (fake reviews violate consumer protection rules & Google policies):

```bash
npx prisma migrate deploy
```

```bash
SEED_DEMO=false SEED_OWNER_EMAIL=you@yourdomain.com SEED_OWNER_PASSWORD='a-strong-password' npm run db:seed
```

## Deploying to Vercel with a custom domain

1. Push the repo to GitHub, then on [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. **Environment Variables:** set every variable from `.env.example` (use production values). Important:
   - `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` = `https://yourdomain.com`
   - `BETTER_AUTH_SECRET` = output of `openssl rand -base64 32`
3. Deploy. The build runs `prisma generate && next build` and reads the database to pre-render pages, so make sure `DATABASE_URL` is correct.
4. **Domain:** Project → **Settings → Domains → Add** `yourdomain.com` and `www.yourdomain.com`. At your domain registrar (Niagahoster, Rumahweb, Cloudflare, etc.) add:
   - `A` record `@` → `76.76.21.21`
   - `CNAME` record `www` → `cname.vercel-dns.com`
   SSL/HTTPS is provisioned automatically by Vercel within a few minutes.
5. Submit the sitemap in Google Search Console: `https://yourdomain.com/sitemap.xml`.

### Alternative: VPS (Ubuntu)
Install Node 22 + PostgreSQL (or use Supabase), then `npm ci && npx prisma migrate deploy && npm run build`, run `npm start` with **PM2**, set up **Nginx** as a reverse proxy to port 3000, and **Certbot** (`certbot --nginx -d yourdomain.com`) for free SSL.

## Admin dashboard

Open `/admin` and sign in with the owner account. Add team members under **Settings → Admin team** (they must first register an account at `/daftar`).

| Role | Access |
|---|---|
| **Owner** | Everything, including store & team settings |
| **Admin** | Everything except settings |
| **Warehouse Staff** | Orders (process, waybill, print label/invoice, notes) and stock; no sales figures |

Daily workflow: **Orders → filter "Paid"** → *Process order* → print **label** → enter the **waybill number** (the buyer is automatically notified via email & WhatsApp) → completed automatically when the buyer taps "received", or mark it manually.

### Product photos (Cloudinary)
1. Sign up for free at [cloudinary.com](https://cloudinary.com) → **Dashboard** → copy the *Cloud name*, *API Key*, and *API Secret* into `CLOUDINARY_*`.
2. Photos are uploaded directly from the browser to Cloudinary with a server signature (files never pass through your server), stored at max. 2000 px, and served with `f_auto,q_auto` → **automatic WebP/AVIF** depending on the browser.
3. Without Cloudinary (local only), photos are compressed to 1600 px WebP and stored in `public/uploads/` (not committed).

### Product import/export (Excel)
**Stock → Export CSV** produces one row per variant (`;` separator, opens directly in Indonesian-locale Excel). Edit the `stock`, `price`, `compare_at_price`, `variant_price`, or `published` (1/0) columns, save as CSV, then **Import CSV**. Rows are matched by `sku`; every stock change is recorded in the history. New products are created through the form (so photos & descriptions are complete).

### Analytics (GA4 & Meta Pixel)
Set `NEXT_PUBLIC_GA_ID` and/or `NEXT_PUBLIC_META_PIXEL_ID`. Visitors see a cookie notice; scripts are only loaded after they click **Accept** (in line with Indonesia's Personal Data Protection Law). Events sent: `PageView`, `add_to_cart`/`AddToCart`, `begin_checkout`/`InitiateCheckout`, and `purchase`/`Purchase` (once the order is paid).

## Technical notes
- **Cache:** catalog data is cached with `"use cache"` + `cacheTag`; the admin dashboard calls `updateTag(...)` after mutating data so changes show up in the store immediately.
- **Security:** passwords are hashed (scrypt) by Better Auth; session cookies are httpOnly + Secure in production; built-in Better Auth CSRF protection (Origin check); rate limits: login 5×/minute, sign-up 5×/minute, reset 3×/5 minutes; all URL parameters are validated on the server; React escapes output (JSON-LD is escaped manually); post-login redirects only go to internal paths.
- **Product images:** sample data uses SVG illustrations in `public/images`; replace them with real photos via **Admin → Products** (Cloudinary).
- **Wishlist notifications:** when a product's price drops / a compare-at price is set, or stock comes back from 0, users who saved that product receive an email (+ WhatsApp if they have a number), at most once per 24 hours per product.
