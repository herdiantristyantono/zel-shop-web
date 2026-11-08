import "server-only";

/** 08xx / +628xx / 628xx → 628xx */
export function normalizePhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.startsWith("8")) return `62${d}`;
  return d;
}

/**
 * Kirim WhatsApp via gateway pihak ketiga (default format Fonnte: https://fonnte.com).
 * Tanpa WHATSAPP_API_TOKEN → pesan dicetak ke konsol.
 */
export async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const url = process.env.WHATSAPP_API_URL || "https://api.fonnte.com/send";
  const target = normalizePhone(to);
  if (!target) return;
  if (!token) {
    console.info(`\n[whatsapp:dev] → ${target}\n${message}\n`);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({ target, message, countryCode: "62" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[whatsapp] gagal", res.status, await res.text());
  } catch (e) {
    console.error("[whatsapp] gagal", e);
  }
}
