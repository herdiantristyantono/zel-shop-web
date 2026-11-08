/**
 * Membuat ilustrasi produk (SVG) sebagai placeholder foto sampai foto asli diunggah lewat dashboard admin.
 * Jalankan: npx tsx scripts/generate-product-images.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { categories, COLORS, products, type Shape } from "../prisma/seed-data";
import { slugify } from "../src/lib/format";

const OUT = join(process.cwd(), "public/images");
const GOLD = "#C9A06A";

function adjust(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function shapeSvg(shape: Shape, c: string, gid = "g") {
  const d = adjust(c, -0.28);
  const l = adjust(c, 0.12);
  const st = adjust(c, 0.35);
  const stitch = `stroke="${st}" stroke-width="2" stroke-dasharray="7 6" fill="none" opacity=".75"`;
  const body = `fill="url(#${gid})"`;
  switch (shape) {
    case "long-wallet":
      return `
<rect x="140" y="270" width="520" height="280" rx="22" ${body}/>
<rect x="154" y="284" width="492" height="252" rx="14" ${stitch}/>
<path d="M140 292a22 22 0 0 1 22-22h476a22 22 0 0 1 22 22v116q0 12-12 14L400 454 152 422q-12-2-12-14z" fill="${l}"/>
<path d="M160 300h480v100L400 432 160 400z" ${stitch}/>
<circle cx="400" cy="440" r="17" fill="${GOLD}"/><circle cx="400" cy="440" r="8" fill="${adjust(GOLD, -0.2)}"/>`;
    case "card-holder":
      return `
<rect x="250" y="262" width="300" height="70" rx="8" fill="#F7EFE6"/>
<rect x="270" y="252" width="260" height="60" rx="8" fill="${adjust(GOLD, 0.35)}"/>
<rect x="220" y="300" width="360" height="250" rx="18" ${body}/>
<rect x="232" y="312" width="336" height="226" rx="12" ${stitch}/>
<path d="M220 360h360M220 410h360" stroke="${d}" stroke-width="3" opacity=".55"/>
<rect x="372" y="470" width="56" height="10" rx="5" fill="${GOLD}"/>`;
    case "sling":
      return `
<path d="M232 380C210 200 300 96 400 96s190 104 168 284" stroke="${d}" stroke-width="14" fill="none" stroke-linecap="round"/>
<circle cx="230" cy="372" r="13" fill="none" stroke="${GOLD}" stroke-width="6"/><circle cx="570" cy="372" r="13" fill="none" stroke="${GOLD}" stroke-width="6"/>
<rect x="200" y="350" width="400" height="270" rx="32" ${body}/>
<path d="M200 382a32 32 0 0 1 32-32h336a32 32 0 0 1 32 32v96q0 24-24 24H224q-24 0-24-24z" fill="${l}"/>
<path d="M214 384q0-20 20-20h332q20 0 20 20v88q0 16-16 16H230q-16 0-16-16z" ${stitch}/>
<rect x="374" y="478" width="52" height="38" rx="8" fill="${GOLD}"/><rect x="386" y="488" width="28" height="18" rx="4" fill="${adjust(GOLD, -0.25)}"/>`;
    case "handbag":
      return `
<path d="M300 340C300 170 500 170 500 340" stroke="${d}" stroke-width="20" fill="none" stroke-linecap="round"/>
<path d="M210 330h380l40 268q3 22-19 22H189q-22 0-19-22z" ${body}/>
<path d="M210 330h380l8 54H202z" fill="${l}"/>
<path d="M222 398h356l30 200H192z" ${stitch}/>
<rect x="372" y="362" width="56" height="44" rx="10" fill="${GOLD}"/><circle cx="400" cy="384" r="9" fill="${adjust(GOLD, -0.25)}"/>
<circle cx="214" cy="612" r="7" fill="${GOLD}"/><circle cx="586" cy="612" r="7" fill="${GOLD}"/>`;
    case "tote":
      return `
<path d="M285 310C285 120 365 120 365 310M435 310C435 120 515 120 515 310" stroke="${d}" stroke-width="18" fill="none" stroke-linecap="round"/>
<path d="M190 300h420l-28 330q-2 18-20 18H238q-18 0-20-18z" ${body}/>
<path d="M206 318h388" ${stitch}/>
<rect x="270" y="296" width="30" height="64" rx="6" fill="${d}"/><rect x="350" y="296" width="30" height="64" rx="6" fill="${d}"/>
<rect x="420" y="296" width="30" height="64" rx="6" fill="${d}"/><rect x="500" y="296" width="30" height="64" rx="6" fill="${d}"/>
<circle cx="400" cy="420" r="12" fill="${GOLD}"/>`;
    case "backpack":
      return `
<path d="M362 200q0-60 38-60t38 60" stroke="${d}" stroke-width="14" fill="none"/>
<path d="M258 300q-30 120-10 300M542 300q30 120 10 300" stroke="${d}" stroke-width="16" fill="none" stroke-linecap="round"/>
<rect x="250" y="190" width="300" height="440" rx="90" ${body}/>
<path d="M250 300q0-110 150-110t150 110v20H250z" fill="${l}"/>
<path d="M268 296q4-88 132-88t132 88" ${stitch}/>
<rect x="290" y="420" width="220" height="160" rx="34" fill="${l}"/>
<path d="M306 448h188" stroke="${d}" stroke-width="4" stroke-linecap="round"/>
<rect x="468" y="438" width="10" height="26" rx="4" fill="${GOLD}"/>
<rect x="304" y="460" width="192" height="106" rx="24" ${stitch}/>`;
    case "clutch":
      return `
<rect x="150" y="320" width="500" height="230" rx="16" ${body}/>
<rect x="164" y="334" width="472" height="202" rx="10" ${stitch}/>
<path d="M150 336q0-16 16-16h468q16 0 16 16L412 478q-12 8-24 0z" fill="${l}"/>
<path d="M176 340L400 462 624 340" ${stitch}/>
<rect x="150" y="312" width="500" height="12" rx="6" fill="${GOLD}"/>
<circle cx="400" cy="466" r="14" fill="${GOLD}"/>`;
  }
}

function svg(shape: Shape, color: string, view: 1 | 2 | 3) {
  const bg = view === 2 ? "#F4E4E1" : "#FBF5F3";
  const viewBox = view === 3 ? "200 250 400 400" : "0 0 800 800";
  const transform = view === 2 ? `transform="translate(400 430) rotate(-6) scale(.88) translate(-400 -430)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${adjust(color, 0.08)}"/><stop offset="1" stop-color="${adjust(color, -0.14)}"/></linearGradient></defs>
<rect x="0" y="0" width="800" height="800" fill="${bg}"/>
<ellipse cx="400" cy="660" rx="260" ry="22" fill="#2A1A22" opacity=".07"/>
<g ${transform}>${shapeSvg(shape, color)}</g>
</svg>`;
}

function banner(shapes: [Shape, string][]) {
  const pos = [
    [920, 120, 0.9],
    [1180, 260, 0.75],
    [760, 330, 0.6],
  ];
  const groups = shapes
    .map(([s, c], i) => {
      const [x, y, k] = pos[i];
      return `<g transform="translate(${x} ${y}) scale(${k})"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${adjust(c, 0.08)}"/><stop offset="1" stop-color="${adjust(c, -0.14)}"/></linearGradient></defs>${shapeSvg(s, c, `g${i}`)}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" width="1600" height="800">
<rect width="1600" height="800" fill="#F4E4E1"/><circle cx="1220" cy="420" r="330" fill="#FBF5F3"/>
<circle cx="1220" cy="420" r="350" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".6"/>${groups}</svg>`;
}

function write(path: string, content: string) {
  mkdirSync(join(OUT, path, ".."), { recursive: true });
  writeFileSync(join(OUT, path), content);
}

const shapeOf = Object.fromEntries(categories.map((c) => [c.slug, c.shape]));
let count = 0;
for (const p of products) {
  for (const v of p.variants) {
    for (const view of [1, 2, 3] as const) {
      write(`products/${p.slug}/${slugify(v.color)}-${view}.svg`, svg(shapeOf[p.category], COLORS[v.color], view));
      count++;
    }
  }
}
const catColors = ["#5B2A45", "#D8A7A7", "#A57C5B", "#1F1A1C", "#E6D5BE", "#B9A3C9", "#6E2236"];
categories.forEach((c, i) => write(`categories/${c.slug}.svg`, svg(c.shape, catColors[i], 1)));
write("banners/koleksi-baru.svg", banner([["handbag", "#5B2A45"], ["sling", "#D8A7A7"], ["card-holder", "#E6D5BE"]]));
write("banners/flash-sale.svg", banner([["tote", "#A57C5B"], ["clutch", "#1F1A1C"], ["long-wallet", "#D8A7A7"]]));
console.log(`✔ ${count} gambar produk + ${categories.length} kategori + 2 banner dibuat di public/images`);
