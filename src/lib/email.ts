import "server-only";

type Mail = { to: string; subject: string; html: string; text?: string };

/**
 * Kirim email via Resend (https://resend.com). Tanpa RESEND_API_KEY,
 * email hanya dicetak ke konsol — praktis untuk pengembangan lokal.
 */
export async function sendEmail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Zel Shop <no-reply@zelshop.id>";
  if (!key) {
    console.info(`\n[email:dev] → ${mail.to}\nSubjek: ${mail.subject}\n${mail.text ?? mail.html}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...mail }),
  });
  if (!res.ok) console.error("[email] gagal kirim", res.status, await res.text());
}

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FBF5F3;font-family:Arial,sans-serif;color:#2A1A22">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:26px;letter-spacing:4px;color:#5B2A45;text-align:center">ZEL SHOP</td></tr>
<tr><td style="padding-top:24px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${body}</td></tr>
</table></td></tr></table></body></html>`;
}
