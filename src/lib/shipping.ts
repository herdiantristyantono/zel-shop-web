import "server-only";
import { getStoreSettings } from "./settings";

/**
 * Integrasi Biteship (https://biteship.com/id/docs/api).
 * Tanpa BITESHIP_API_KEY → data contoh (mock) agar checkout tetap bisa dicoba di lokal.
 */
const API = "https://api.biteship.com/v1";
const key = () => process.env.BITESHIP_API_KEY;
export const isMockShipping = () => !key();

export type Area = { id: string; label: string; province: string; city: string; district: string; postalCode: string };
export type Rate = { courierCode: string; courierName: string; serviceCode: string; serviceName: string; price: number; etd: string };
export type RateItem = { name: string; value: number; weightGram: number; quantity: number };

export const COURIER_NAMES: Record<string, string> = { jne: "JNE", jnt: "J&T Express", sicepat: "SiCepat", anteraja: "AnterAja", pos: "POS Indonesia" };

async function biteship<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: key()!, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    console.error("[biteship]", path, res.status, body);
    throw new Error(body?.error ?? "Gagal menghubungi layanan ongkir");
  }
  return body as T;
}

export async function searchAreas(input: string): Promise<Area[]> {
  const q = input.trim();
  if (q.length < 3) return [];
  if (isMockShipping()) return MOCK_AREAS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  type R = {
    areas: {
      id: string;
      name: string;
      administrative_division_level_1_name: string;
      administrative_division_level_2_name: string;
      administrative_division_level_3_name: string;
      postal_code: number | string;
    }[];
  };
  const data = await biteship<R>(`/maps/areas?countries=ID&type=single&input=${encodeURIComponent(q)}`);
  return data.areas.map((a) => ({
    id: a.id,
    label: a.name,
    province: a.administrative_division_level_1_name,
    city: a.administrative_division_level_2_name,
    district: a.administrative_division_level_3_name,
    postalCode: String(a.postal_code ?? ""),
  }));
}

export async function getRates(destinationAreaId: string, items: RateItem[]): Promise<Rate[]> {
  const settings = await getStoreSettings();
  const couriers = settings.activeCouriers.length ? settings.activeCouriers : Object.keys(COURIER_NAMES);
  if (isMockShipping()) return mockRates(destinationAreaId, items, couriers);
  const origin = settings.originAreaId ?? process.env.BITESHIP_ORIGIN_AREA_ID;
  if (!origin) throw new Error("Alamat asal pengiriman belum diatur (originAreaId).");
  type R = {
    pricing: {
      courier_code: string;
      courier_name: string;
      courier_service_code: string;
      courier_service_name: string;
      price: number;
      shipment_duration_range: string;
      shipment_duration_unit: string;
    }[];
  };
  const data = await biteship<R>("/rates/couriers", {
    method: "POST",
    body: JSON.stringify({
      origin_area_id: origin,
      destination_area_id: destinationAreaId,
      couriers: couriers.join(","),
      items: items.map((i) => ({ name: i.name, value: i.value, weight: i.weightGram, quantity: i.quantity })),
    }),
  });
  return data.pricing
    .map((p) => ({
      courierCode: p.courier_code,
      courierName: COURIER_NAMES[p.courier_code] ?? p.courier_name,
      serviceCode: p.courier_service_code,
      serviceName: p.courier_service_name,
      price: p.price,
      etd: `${p.shipment_duration_range} ${p.shipment_duration_unit === "hours" ? "jam" : "hari"}`,
    }))
    .sort((a, b) => a.price - b.price);
}

// ───────────── Data contoh (tanpa API key) ─────────────

const MOCK_AREAS: Area[] = [
  ["Coblong, Bandung, Jawa Barat. 40132", "Jawa Barat", "Bandung", "Coblong", "40132"],
  ["Sukajadi, Bandung, Jawa Barat. 40162", "Jawa Barat", "Bandung", "Sukajadi", "40162"],
  ["Kebayoran Baru, Jakarta Selatan, DKI Jakarta. 12110", "DKI Jakarta", "Jakarta Selatan", "Kebayoran Baru", "12110"],
  ["Tebet, Jakarta Selatan, DKI Jakarta. 12810", "DKI Jakarta", "Jakarta Selatan", "Tebet", "12810"],
  ["Cengkareng, Jakarta Barat, DKI Jakarta. 11730", "DKI Jakarta", "Jakarta Barat", "Cengkareng", "11730"],
  ["Serpong, Tangerang Selatan, Banten. 15310", "Banten", "Tangerang Selatan", "Serpong", "15310"],
  ["Bekasi Selatan, Bekasi, Jawa Barat. 17141", "Jawa Barat", "Bekasi", "Bekasi Selatan", "17141"],
  ["Depok, Sleman, DI Yogyakarta. 55281", "DI Yogyakarta", "Sleman", "Depok", "55281"],
  ["Tegalsari, Surabaya, Jawa Timur. 60261", "Jawa Timur", "Surabaya", "Tegalsari", "60261"],
  ["Semarang Tengah, Semarang, Jawa Tengah. 50132", "Jawa Tengah", "Semarang", "Semarang Tengah", "50132"],
  ["Medan Baru, Medan, Sumatera Utara. 20153", "Sumatera Utara", "Medan", "Medan Baru", "20153"],
  ["Denpasar Barat, Denpasar, Bali. 80119", "Bali", "Denpasar", "Denpasar Barat", "80119"],
  ["Makassar, Makassar, Sulawesi Selatan. 90111", "Sulawesi Selatan", "Makassar", "Makassar", "90111"],
  ["Balikpapan Kota, Balikpapan, Kalimantan Timur. 76111", "Kalimantan Timur", "Balikpapan", "Balikpapan Kota", "76111"],
].map(([label, province, city, district, postalCode], i) => ({ id: `MOCK${i + 1}`, label, province, city, district, postalCode }));

function mockRates(areaId: string, items: RateItem[], couriers: string[]): Rate[] {
  const area = MOCK_AREAS.find((a) => a.id === areaId);
  if (!area) return [];
  const kg = Math.max(1, Math.ceil(items.reduce((g, i) => g + i.weightGram * i.quantity, 0) / 1000));
  const zone = area.province === "Jawa Barat" ? 1 : ["DKI Jakarta", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur"].includes(area.province) ? 2 : 3;
  const base: Record<string, [number, string, string, string][]> = {
    jne: [[9000, "reg", "REG", "2 - 3"], [18000, "yes", "YES", "1 - 1"]],
    jnt: [[9500, "ez", "EZ", "2 - 3"]],
    sicepat: [[8500, "reg", "REG", "2 - 3"], [15000, "best", "BEST", "1 - 1"]],
    anteraja: [[8800, "reg", "Reguler", "2 - 4"]],
    pos: [[8000, "reg", "Pos Reguler", "3 - 5"]],
  };
  return couriers
    .flatMap((c) =>
      (base[c] ?? []).map(([price, code, name, etd]) => ({
        courierCode: c,
        courierName: COURIER_NAMES[c],
        serviceCode: code,
        serviceName: name,
        price: Math.round((price * zone * kg) / 500) * 500,
        etd: `${zone === 3 ? etd.replace(/\d+/g, (d) => String(Number(d) + 2)) : etd} hari`,
      })),
    )
    .sort((a, b) => a.price - b.price);
}
