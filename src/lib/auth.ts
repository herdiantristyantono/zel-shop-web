import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { connection } from "next/server";
import { prisma } from "./prisma";
import { emailLayout, sendEmail } from "./email";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "Zel Shop",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 jam
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Atur ulang kata sandi Zel Shop",
        text: `Halo ${user.name}, klik tautan berikut untuk mengatur ulang kata sandi (berlaku 1 jam): ${url}`,
        html: emailLayout(
          "Atur ulang kata sandi",
          `<p>Halo ${user.name},</p><p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.</p>
           <p><a href="${url}" style="display:inline-block;background:#5B2A45;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Atur ulang kata sandi</a></p>
           <p style="font-size:13px;color:#6B5560">Tautan berlaku 1 jam. Abaikan email ini jika Anda tidak memintanya.</p>`,
        ),
      });
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      // input:false → pengguna tidak bisa mengatur perannya sendiri saat daftar
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/** Ambil sesi di Server Component / Server Action. */
export async function getSession() {
  await connection(); // selalu per-request (tidak pernah di-prerender)
  return auth.api.getSession({ headers: await headers() });
}

export const isGoogleEnabled = googleEnabled;
