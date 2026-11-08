// Data contoh Zel Shop. Dipakai oleh prisma/seed.ts dan scripts/generate-product-images.ts
export type Shape = "long-wallet" | "card-holder" | "sling" | "handbag" | "tote" | "backpack" | "clutch";

export const COLORS = {
  Hitam: "#1F1A1C",
  "Cokelat Tua": "#5A3A2A",
  "Cokelat Susu": "#A57C5B",
  Krem: "#E6D5BE",
  Maroon: "#6E2236",
  "Dusty Pink": "#D8A7A7",
  Sage: "#9AAE95",
  Navy: "#233049",
  Taupe: "#8B7D73",
  "Putih Gading": "#F2EBDD",
  Lilac: "#B9A3C9",
  Plum: "#5B2A45",
} as const;
export type ColorName = keyof typeof COLORS;

export const categories = [
  { slug: "dompet-panjang", name: "Dompet Panjang", shape: "long-wallet" as Shape, description: "Dompet panjang dengan banyak slot kartu dan ruang uang kertas tanpa dilipat." },
  { slug: "dompet-kecil", name: "Dompet Kecil & Card Holder", shape: "card-holder" as Shape, description: "Ringkas, muat di saku dan tas mini — cukup untuk kartu dan uang tunai secukupnya." },
  { slug: "tas-selempang", name: "Tas Selempang", shape: "sling" as Shape, description: "Tas selempang praktis untuk aktivitas harian, tangan tetap bebas." },
  { slug: "tas-tangan", name: "Tas Tangan / Handbag", shape: "handbag" as Shape, description: "Handbag terstruktur yang membuat penampilan kerja dan acara tampak rapi." },
  { slug: "tote-bag", name: "Tote Bag", shape: "tote" as Shape, description: "Tote lapang untuk laptop, buku, dan perlengkapan seharian." },
  { slug: "ransel-wanita", name: "Ransel Wanita", shape: "backpack" as Shape, description: "Ransel feminin yang nyaman dipakai kuliah, kerja, maupun jalan-jalan." },
  { slug: "clutch-pesta", name: "Clutch & Pesta", shape: "clutch" as Shape, description: "Clutch elegan untuk kondangan, pesta, dan acara spesial." },
];

export type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  size: "MINI" | "SMALL" | "MEDIUM" | "LARGE";
  dims: [number, number, number]; // P × L × T cm
  weightGram: number;
  material: string;
  cardSlots?: number;
  compartments: string;
  description: string;
  featured?: boolean;
  soldCount: number;
  daysAgo: number; // untuk urutan "terbaru"
  variants: { color: ColorName; stock: number }[];
};

export const products: SeedProduct[] = [
  {
    name: "Aurelia Dompet Panjang Lipat",
    slug: "aurelia-dompet-panjang-lipat",
    category: "dompet-panjang",
    price: 149000,
    compareAtPrice: 189000,
    size: "MEDIUM",
    dims: [19, 2.5, 10],
    weightGram: 220,
    material: "Kulit sintetis PU premium, lapisan dalam kain satin",
    cardSlots: 12,
    compartments: "2 ruang uang kertas, 1 kantong koin beresleting, 1 slot ponsel",
    description:
      "Aurelia dirancang untuk Anda yang suka semua serba rapi. Uang kertas tetap lurus tanpa dilipat, 12 slot kartu tersusun bertingkat, dan kantong koin beresleting di tengah menjaga recehan tidak tercecer. Penutup kancing magnet berlapis emas memberi sentuhan mewah yang tetap kalem.",
    featured: true,
    soldCount: 412,
    daysAgo: 40,
    variants: [
      { color: "Hitam", stock: 25 },
      { color: "Dusty Pink", stock: 18 },
      { color: "Cokelat Susu", stock: 2 },
    ],
  },
  {
    name: "Selene Dompet Panjang Resleting",
    slug: "selene-dompet-panjang-resleting",
    category: "dompet-panjang",
    price: 169000,
    size: "MEDIUM",
    dims: [20, 3, 10.5],
    weightGram: 240,
    material: "Kulit sintetis saffiano anti gores",
    cardSlots: 16,
    compartments: "Resleting keliling, 4 ruang uang, 1 kantong koin, 1 slot ponsel hingga 6,7 inci",
    description:
      "Resleting keliling membuat isi dompet aman saat dibawa bepergian. Tekstur saffiano tahan gores dan mudah dibersihkan cukup dengan kain lembap. Muat ponsel hingga 6,7 inci sehingga bisa dipakai sebagai clutch harian.",
    soldCount: 268,
    daysAgo: 25,
    variants: [
      { color: "Maroon", stock: 14 },
      { color: "Navy", stock: 11 },
      { color: "Taupe", stock: 9 },
    ],
  },
  {
    name: "Mila Card Holder Mini",
    slug: "mila-card-holder-mini",
    category: "dompet-kecil",
    price: 69000,
    compareAtPrice: 89000,
    size: "MINI",
    dims: [10.5, 1, 7.5],
    weightGram: 60,
    material: "Kulit sintetis PU lembut",
    cardSlots: 6,
    compartments: "6 slot kartu, 1 kantong tengah untuk uang lipat",
    description:
      "Card holder tipis yang pas di saku blazer atau tas mini. Enam slot kartu ditambah kantong tengah untuk uang lipat dan struk. Pilihan tepat untuk hadiah kecil yang tetap berkesan.",
    featured: true,
    soldCount: 530,
    daysAgo: 60,
    variants: [
      { color: "Dusty Pink", stock: 30 },
      { color: "Sage", stock: 22 },
      { color: "Krem", stock: 0 },
      { color: "Hitam", stock: 27 },
    ],
  },
  {
    name: "Nara Dompet Lipat Tiga",
    slug: "nara-dompet-lipat-tiga",
    category: "dompet-kecil",
    price: 99000,
    size: "SMALL",
    dims: [11, 3, 9],
    weightGram: 120,
    material: "Kulit sapi split asli",
    cardSlots: 8,
    compartments: "Lipat tiga, 1 ruang uang, kantong koin kancing, jendela kartu identitas",
    description:
      "Dompet lipat tiga dari kulit sapi asli yang semakin cantik seiring pemakaian. Ukurannya ringkas namun tetap muat 8 kartu, uang kertas, dan koin. Dilengkapi jendela transparan untuk KTP.",
    soldCount: 154,
    daysAgo: 12,
    variants: [
      { color: "Cokelat Tua", stock: 12 },
      { color: "Lilac", stock: 8 },
    ],
  },
  {
    name: "Kirana Tas Selempang Kotak",
    slug: "kirana-tas-selempang-kotak",
    category: "tas-selempang",
    price: 219000,
    compareAtPrice: 279000,
    size: "SMALL",
    dims: [20, 7, 14],
    weightGram: 420,
    material: "Kulit sintetis PU tekstur halus, hardware logam anti karat",
    compartments: "1 ruang utama, 1 kantong resleting dalam, 2 slot kartu",
    description:
      "Kirana adalah tas selempang berbentuk kotak dengan flap magnet yang rapi. Tali bisa diatur panjangnya dan dilepas, sehingga bisa dipakai sebagai selempang maupun bahu. Muat ponsel, dompet panjang, kunci, dan peralatan make-up kecil.",
    featured: true,
    soldCount: 389,
    daysAgo: 8,
    variants: [
      { color: "Krem", stock: 16 },
      { color: "Hitam", stock: 20 },
      { color: "Sage", stock: 3 },
    ],
  },
  {
    name: "Luna Tas Selempang Bulan Sabit",
    slug: "luna-tas-selempang-bulan-sabit",
    category: "tas-selempang",
    price: 189000,
    size: "SMALL",
    dims: [24, 6, 13],
    weightGram: 350,
    material: "Kulit sintetis PU lembut (soft leather)",
    compartments: "1 ruang utama beresleting, 1 kantong dalam",
    description:
      "Siluet bulan sabit yang sedang tren, dengan bahan lembut yang jatuh mengikuti tubuh. Ringan dipakai seharian, cocok untuk ngopi, belanja, atau jalan-jalan akhir pekan.",
    soldCount: 201,
    daysAgo: 3,
    variants: [
      { color: "Cokelat Susu", stock: 15 },
      { color: "Putih Gading", stock: 10 },
    ],
  },
  {
    name: "Anindya Handbag Kerja",
    slug: "anindya-handbag-kerja",
    category: "tas-tangan",
    price: 329000,
    compareAtPrice: 399000,
    size: "MEDIUM",
    dims: [28, 13, 22],
    weightGram: 780,
    material: "Kulit sintetis saffiano, lapisan dalam kanvas",
    compartments: "3 sekat (tengah beresleting), 1 kantong dalam, 2 slot ponsel, tali selempang tambahan",
    description:
      "Handbag terstruktur yang membuat penampilan kerja terlihat rapi. Tiga sekat membantu memisahkan dokumen A5, pouch make-up, dan barang pribadi. Kaki logam di bagian bawah melindungi tas saat diletakkan.",
    featured: true,
    soldCount: 176,
    daysAgo: 30,
    variants: [
      { color: "Hitam", stock: 10 },
      { color: "Taupe", stock: 7 },
      { color: "Maroon", stock: 1 },
    ],
  },
  {
    name: "Camelia Top Handle Bag",
    slug: "camelia-top-handle-bag",
    category: "tas-tangan",
    price: 279000,
    size: "SMALL",
    dims: [22, 10, 16],
    weightGram: 560,
    material: "Kulit sintetis PU premium glossy",
    compartments: "1 ruang utama, 1 kantong resleting dalam",
    description:
      "Tas tangan mungil dengan pegangan atas yang anggun. Cocok dipadukan dengan dress maupun setelan kasual. Tali selempang tipis disertakan untuk gaya alternatif.",
    soldCount: 98,
    daysAgo: 1,
    variants: [
      { color: "Dusty Pink", stock: 9 },
      { color: "Putih Gading", stock: 8 },
      { color: "Plum", stock: 6 },
    ],
  },
  {
    name: "Saskia Tote Bag Laptop",
    slug: "saskia-tote-bag-laptop",
    category: "tote-bag",
    price: 259000,
    compareAtPrice: 299000,
    size: "LARGE",
    dims: [38, 14, 30],
    weightGram: 820,
    material: "Kulit sintetis PU tebal, dasar dengan papan penguat",
    compartments: "Ruang utama lapang, sekat laptop berbusa hingga 14 inci, 2 kantong dalam, resleting atas",
    description:
      "Tote serbaguna untuk pekerja dan mahasiswi. Sekat berbusa melindungi laptop hingga 14 inci, dasar diperkuat agar tas tetap tegak. Tali bahu cukup panjang untuk dipakai di atas jaket.",
    soldCount: 244,
    daysAgo: 18,
    variants: [
      { color: "Hitam", stock: 13 },
      { color: "Cokelat Susu", stock: 12 },
      { color: "Krem", stock: 5 },
    ],
  },
  {
    name: "Gendis Tote Kanvas",
    slug: "gendis-tote-kanvas",
    category: "tote-bag",
    price: 159000,
    size: "LARGE",
    dims: [40, 12, 34],
    weightGram: 450,
    material: "Kanvas katun tebal 16 oz dengan aksen kulit sintetis",
    compartments: "1 ruang utama, 1 kantong dalam beresleting, kancing magnet",
    description:
      "Tote kanvas tebal yang ringan dan kuat untuk belanja, kuliah, atau ke pantai. Aksen kulit sintetis pada pegangan membuatnya tetap terlihat rapi. Bisa dicuci tangan.",
    soldCount: 321,
    daysAgo: 50,
    variants: [
      { color: "Putih Gading", stock: 24 },
      { color: "Sage", stock: 17 },
      { color: "Navy", stock: 14 },
    ],
  },
  {
    name: "Tari Ransel Mini",
    slug: "tari-ransel-mini",
    category: "ransel-wanita",
    price: 239000,
    compareAtPrice: 289000,
    size: "SMALL",
    dims: [22, 11, 27],
    weightGram: 610,
    material: "Kulit sintetis PU lembut, tali bahu berbantalan",
    compartments: "1 ruang utama, kantong depan beresleting, kantong belakang anti copet",
    description:
      "Ransel mini yang manis untuk jalan-jalan dan nongkrong. Kantong belakang anti copet menyimpan ponsel dan dompet dengan aman. Tali bahu berbantalan tetap nyaman dipakai lama.",
    featured: true,
    soldCount: 287,
    daysAgo: 5,
    variants: [
      { color: "Krem", stock: 11 },
      { color: "Lilac", stock: 9 },
      { color: "Hitam", stock: 15 },
    ],
  },
  {
    name: "Rinjani Ransel Kerja",
    slug: "rinjani-ransel-kerja",
    category: "ransel-wanita",
    price: 319000,
    size: "LARGE",
    dims: [30, 13, 40],
    weightGram: 900,
    material: "Nilon water-resistant dengan aksen kulit sintetis",
    compartments: "Sekat laptop 15,6 inci, ruang utama, kantong depan, 2 kantong samping botol",
    description:
      "Ransel kerja yang tetap feminin. Bahan nilon tahan cipratan air, sekat laptop hingga 15,6 inci, serta kantong samping untuk botol minum. Ada tali troli di bagian belakang untuk perjalanan dinas.",
    soldCount: 133,
    daysAgo: 22,
    variants: [
      { color: "Navy", stock: 8 },
      { color: "Taupe", stock: 10 },
    ],
  },
  {
    name: "Ratu Clutch Pesta Satin",
    slug: "ratu-clutch-pesta-satin",
    category: "clutch-pesta",
    price: 179000,
    compareAtPrice: 229000,
    size: "SMALL",
    dims: [24, 5, 13],
    weightGram: 300,
    material: "Satin premium, bingkai logam berlapis emas",
    compartments: "1 ruang utama, rantai selempang yang bisa dilepas",
    description:
      "Clutch satin dengan bingkai logam keemasan, siap menemani kondangan dan pesta. Rantai selempang dapat dilepas sehingga bisa dipakai di tangan maupun bahu. Muat ponsel, lipstik, dan kunci.",
    featured: true,
    soldCount: 198,
    daysAgo: 15,
    variants: [
      { color: "Plum", stock: 9 },
      { color: "Hitam", stock: 12 },
      { color: "Putih Gading", stock: 6 },
    ],
  },
  {
    name: "Sekar Clutch Amplop",
    slug: "sekar-clutch-amplop",
    category: "clutch-pesta",
    price: 139000,
    size: "SMALL",
    dims: [26, 2, 15],
    weightGram: 220,
    material: "Kulit sintetis PU metalik",
    compartments: "Flap amplop magnet, 1 ruang utama, 3 slot kartu",
    description:
      "Clutch berbentuk amplop yang tipis dan elegan. Dapat juga dipakai sebagai dompet besar sehari-hari. Hadir dalam warna netral yang mudah dipadukan.",
    soldCount: 87,
    daysAgo: 2,
    variants: [
      { color: "Krem", stock: 14 },
      { color: "Dusty Pink", stock: 0 },
      { color: "Maroon", stock: 7 },
    ],
  },
];

export const testimonials = [
  { name: "Rani A.", city: "Bandung", rating: 5, body: "Dompet Aurelia-nya cantik banget, jahitan rapi dan warnanya persis seperti di foto. Pengiriman juga cepat!" },
  { name: "Dewi K.", city: "Surabaya", rating: 5, body: "Tas Kirana jadi andalan buat ke kantor. Muat banyak tapi tetap kelihatan mungil. Admin ramah banget." },
  { name: "Putri S.", city: "Jakarta Selatan", rating: 5, body: "Beli clutch Ratu buat kondangan, banyak yang tanya beli di mana. Packing aman pakai dus dan bubble wrap." },
  { name: "Ayu L.", city: "Yogyakarta", rating: 4, body: "Ransel mininya lucu dan ringan. Kantong belakangnya praktis buat HP. Semoga ada warna baru lagi." },
];
