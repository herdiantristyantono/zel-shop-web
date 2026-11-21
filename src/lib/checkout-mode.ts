import "server-only";

/**
 * CHECKOUT_MODE=whatsapp → pesanan dibuat tanpa pembayaran online & tanpa pilihan kurir.
 * Pembeli mengonfirmasi pesanan ke admin via WhatsApp; admin mengatur ongkir, pembayaran,
 * dan pengiriman secara manual lalu memperbarui status dari dashboard.
 */
export const isWhatsAppCheckout = () => process.env.CHECKOUT_MODE === "whatsapp";
