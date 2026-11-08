"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { getShippingOptions, placeOrder, previewTotals } from "@/actions/checkout";
import type { CartLine } from "@/lib/cart";
import type { Totals } from "@/lib/coupon";
import { rupiah } from "@/lib/format";
import { track } from "../Analytics";
import type { Rate } from "@/lib/shipping";
import { AddressFields, draftToInput, emptyAddress, type AddressDraft } from "../account/AddressFields";
import type { SavedAddress } from "../account/AddressBook";
import { ProductImage } from "../ProductImage";

type Props = {
  lines: CartLine[];
  subtotal: number;
  user: { name: string; email: string } | null;
  addresses: SavedAddress[];
  paymentMethods: { value: string; label: string; hint: string }[];
  mockShipping: boolean;
};

const STEPS = ["Alamat", "Pengiriman", "Pembayaran"];

export function CheckoutFlow({ lines, subtotal, user, addresses, paymentMethods, mockShipping }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    track("begin_checkout", { value: subtotal, items: lines.map((l) => ({ id: l.sku, name: l.productName, price: l.unitPrice, quantity: l.quantity })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Langkah 1
  const usable = addresses.filter((a) => a.areaId);
  const [addressId, setAddressId] = useState<string>(usable.find((a) => a.isDefault)?.id ?? usable[0]?.id ?? "new");
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress);
  const [saveAddr, setSaveAddr] = useState(true);
  const [contact, setContact] = useState({ email: "", customerName: "" });
  // Langkah 2
  const [rates, setRates] = useState<Rate[]>([]);
  const [rate, setRate] = useState<Rate | null>(null);
  // Langkah 3
  const [payment, setPayment] = useState(paymentMethods[0]?.value ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [note, setNote] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);

  const saved = addresses.find((a) => a.id === addressId);
  const dest = addressId === "new" ? draft.area : saved ? { id: saved.areaId! } : null;
  const email = user?.email ?? contact.email;

  function goShipping() {
    setError(null);
    if (!user && (!/^\S+@\S+\.\S+$/.test(contact.email) || contact.customerName.trim().length < 2)) return setError("Isi nama dan email yang valid.");
    if (addressId === "new") {
      if (!draft.area) return setError("Pilih kecamatan dari daftar.");
      if (draft.recipientName.trim().length < 2 || draft.phone.trim().length < 9 || draft.street.trim().length < 8) return setError("Lengkapi nama penerima, nomor HP, dan alamat lengkap.");
    }
    if (!dest?.id) return setError("Pilih alamat pengiriman.");
    start(async () => {
      const res = await getShippingOptions(dest.id);
      if (!res.ok) return setError(res.error);
      setRates(res.rates);
      setRate((r) => res.rates.find((x) => x.courierCode === r?.courierCode && x.serviceCode === r?.serviceCode) ?? null);
      setStep(1);
    });
  }

  function goPayment() {
    setError(null);
    if (!rate) return setError("Pilih layanan pengiriman.");
    start(async () => {
      setTotals(await previewTotals({ shippingCost: rate.price, couponCode: coupon, email }));
      setStep(2);
    });
  }

  function applyCoupon(code: string) {
    start(async () => {
      const t = await previewTotals({ shippingCost: rate?.price ?? 0, couponCode: code, email });
      setTotals(t);
      setCoupon(t.coupon ? t.coupon.code : "");
    });
  }

  function submit() {
    setError(null);
    if (!rate || !payment) return;
    start(async () => {
      const res = await placeOrder({
        contact: user ? undefined : contact,
        addressId: addressId !== "new" ? addressId : undefined,
        address: addressId === "new" ? withoutLabel(draftToInput(draft)) : undefined,
        saveAddress: Boolean(user) && addressId === "new" && saveAddr,
        courierCode: rate.courierCode,
        serviceCode: rate.serviceCode,
        paymentMethod: payment,
        couponCode: coupon || undefined,
        note: note || undefined,
      });
      if (!res.ok) return setError(res.error);
      router.replace(`/pesanan/${res.orderNumber}?token=${res.token}&baru=1`);
    });
  }

  const shippingNet = rate ? rate.price - (totals?.shippingDiscount ?? 0) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div ref={topRef} className="min-w-0 scroll-mt-32">
        <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Langkah checkout">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${i <= step ? "bg-plum text-white" : "bg-blush text-muted"}`}>{i + 1}</span>
              <span className={i === step ? "font-medium text-ink" : "hidden text-muted sm:inline"}>{s}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-line sm:w-10" aria-hidden />}
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="mb-6 rounded-xl bg-[#FBE9EC] px-4 py-3 text-sm text-danger">{error}</p>}

        {step === 0 && (
          <section aria-labelledby="s1" className="space-y-6">
            {!user && (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="s1" className="text-2xl">Kontak</h2>
                  <Link href="/masuk?next=/checkout" className="text-sm text-plum underline">Sudah punya akun? Masuk</Link>
                </div>
                <p className="mt-1 text-sm text-muted">Checkout sebagai tamu. Status pesanan dikirim ke email ini.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="c-name">Nama lengkap</label>
                    <input id="c-name" className="input" autoComplete="name" value={contact.customerName} onChange={(e) => setContact({ ...contact, customerName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-email">Email</label>
                    <input id="c-email" type="email" className="input" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-2xl">Alamat pengiriman</h2>
              {usable.length > 0 && (
                <fieldset className="mt-4 space-y-2">
                  <legend className="sr-only">Pilih alamat</legend>
                  {usable.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${addressId === a.id ? "border-plum bg-plum-soft/40" : "border-line"}`}>
                      <input type="radio" name="addr" className="mt-1 h-5 w-5 accent-plum" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span className="text-sm">
                        <span className="font-medium text-ink">{a.label} · {a.recipientName}</span> <span className="text-muted">({a.phone})</span>
                        <span className="mt-1 block text-muted">{a.street}, {a.district}, {a.city}, {a.province} {a.postalCode}</span>
                      </span>
                    </label>
                  ))}
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${addressId === "new" ? "border-plum bg-plum-soft/40" : "border-line"}`}>
                    <input type="radio" name="addr" className="h-5 w-5 accent-plum" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                    <span className="text-sm font-medium text-ink">Gunakan alamat baru</span>
                  </label>
                </fieldset>
              )}
              {addressId === "new" && (
                <div className="mt-4">
                  <AddressFields value={draft} onChange={setDraft} showLabel={false} />
                  {user && (
                    <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                      <input type="checkbox" className="h-5 w-5 accent-plum" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Simpan ke buku alamat
                    </label>
                  )}
                </div>
              )}
            </div>
            <button type="button" disabled={pending} onClick={goShipping} className="btn-primary h-12 w-full sm:w-auto">
              {pending ? "Menghitung ongkir…" : "Lanjut ke pengiriman"}
            </button>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="s2" className="space-y-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 id="s2" className="text-2xl">Pilih pengiriman</h2>
              {mockShipping && <p className="mt-1 text-xs text-muted">Mode contoh: tarif simulasi (BITESHIP_API_KEY belum diisi).</p>}
              <fieldset className="mt-4 space-y-2">
                <legend className="sr-only">Kurir</legend>
                {rates.map((r) => {
                  const key = `${r.courierCode}-${r.serviceCode}`;
                  const checked = rate?.courierCode === r.courierCode && rate?.serviceCode === r.serviceCode;
                  return (
                    <label key={key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${checked ? "border-plum bg-plum-soft/40" : "border-line"}`}>
                      <input type="radio" name="rate" className="h-5 w-5 accent-plum" checked={checked} onChange={() => setRate(r)} />
                      <span className="flex-1 text-sm">
                        <span className="font-medium text-ink">{r.courierName} {r.serviceName}</span>
                        <span className="block text-muted">Estimasi {r.etd}</span>
                      </span>
                      <span className="font-semibold text-ink">{rupiah(r.price)}</span>
                    </label>
                  );
                })}
              </fieldset>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(0)} className="btn-outline h-12">Kembali</button>
              <button type="button" disabled={pending || !rate} onClick={goPayment} className="btn-primary h-12">Lanjut ke pembayaran</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="s3" className="space-y-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 id="s3" className="text-2xl">Metode pembayaran</h2>
              <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Metode pembayaran</legend>
                {paymentMethods.map((m) => (
                  <label key={m.value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${payment === m.value ? "border-plum bg-plum-soft/40" : "border-line"}`}>
                    <input type="radio" name="pay" className="h-5 w-5 accent-plum" checked={payment === m.value} onChange={() => setPayment(m.value)} />
                    <span className="text-sm">
                      <span className="font-medium text-ink">{m.label}</span>
                      <span className="block text-muted">{m.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <label className="label" htmlFor="coupon">Kode kupon</label>
              <div className="flex gap-2">
                <input id="coupon" className="input uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="mis. ZELBARU" maxLength={30} />
                {coupon ? (
                  <button type="button" disabled={pending} onClick={() => (setCouponInput(""), applyCoupon(""))} className="btn-outline shrink-0">Hapus</button>
                ) : (
                  <button type="button" disabled={pending || !couponInput.trim()} onClick={() => applyCoupon(couponInput)} className="btn-outline shrink-0">Pakai</button>
                )}
              </div>
              {totals?.couponError && couponInput && !coupon && <p className="mt-2 text-sm text-danger" role="alert">{totals.couponError}</p>}
              {totals?.coupon && <p className="mt-2 text-sm text-success" role="status">Kupon {totals.coupon.code} dipakai. {totals.coupon.description}</p>}
              <label className="label mt-5" htmlFor="note">Catatan untuk penjual <span className="font-normal text-muted">(opsional)</span></label>
              <textarea id="note" className="input min-h-20 py-3" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. tolong bungkus kado" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-outline h-12">Kembali</button>
              <button type="button" disabled={pending || !payment} onClick={submit} className="btn-primary h-12 flex-1 sm:flex-none">
                {pending ? "Memproses…" : `Buat pesanan · ${rupiah(totals?.total ?? subtotal)}`}
              </button>
            </div>
            <p className="text-xs text-muted">
              Dengan membuat pesanan, Anda menyetujui <Link href="/info/syarat-ketentuan" className="underline">Syarat & Ketentuan</Link> dan{" "}
              <Link href="/info/kebijakan-pengembalian" className="underline">Kebijakan Pengembalian</Link>.
            </p>
          </section>
        )}
      </div>

      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-white p-6 lg:sticky lg:top-40" aria-labelledby="ringkasan">
        <h2 id="ringkasan" className="text-2xl">Pesanan Anda</h2>
        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-blush">
                {l.image && <ProductImage src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-0 -top-0 rounded-bl-lg bg-plum px-1.5 text-[11px] font-semibold text-white">{l.quantity}</span>
              </span>
              <span className="flex-1">
                <span className="block text-ink">{l.productName}</span>
                <span className="text-muted">{l.colorName}</span>
              </span>
              <span className="font-medium">{rupiah(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(subtotal)}</dd></div>
          {totals && totals.discount > 0 && <div className="flex justify-between text-plum"><dt>Diskon kupon</dt><dd>-{rupiah(totals.discount)}</dd></div>}
          <div className="flex justify-between">
            <dt>Ongkir{rate && ` (${rate.courierName} ${rate.serviceName})`}</dt>
            <dd>
              {shippingNet == null ? <span className="text-muted">—</span> : shippingNet === 0 ? <span className="font-medium text-success">Gratis</span> : rupiah(shippingNet)}
              {totals && totals.shippingDiscount > 0 && shippingNet !== 0 && rate && <span className="ml-1 text-xs text-muted line-through">{rupiah(rate.price)}</span>}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{rupiah(totals?.total ?? subtotal + (rate?.price ?? 0))}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function withoutLabel<T extends { label: string }>(input: T): Omit<T, "label"> {
  const copy: Partial<T> = { ...input };
  delete copy.label;
  return copy as Omit<T, "label">;
}
