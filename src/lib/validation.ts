import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Label wajib diisi").max(30),
  recipientName: z.string().trim().min(2, "Nama penerima wajib diisi").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor HP tidak valid (contoh: 081234567890)")),
  province: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos 5 digit"),
  street: z.string().trim().min(8, "Alamat lengkap minimal 8 karakter").max(250),
  areaId: z.string().trim().min(1, "Pilih kecamatan dari daftar").max(80),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.input<typeof addressSchema>;

/** Mode checkout WhatsApp: tanpa pencarian kecamatan — seluruh alamat ditulis bebas di satu kolom. */
export const manualAddressSchema = addressSchema.pick({ recipientName: true, phone: true }).extend({
  street: z.string().trim().min(20, "Tulis alamat lengkap: jalan, nomor, RT/RW, kelurahan, kecamatan, kota, dan kode pos").max(400),
});


export const contactSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(120),
  customerName: z.string().trim().min(2, "Nama wajib diisi").max(80),
})
