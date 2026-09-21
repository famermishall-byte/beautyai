// Draws simple invented product illustrations (SVG) for the DEMO-* products in
// supabase/demo_products.sql → public/demo/<sku>.svg. Placeholders until real
// product photos exist. Run: node scripts/generate-demo-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/demo";
mkdirSync(OUT, { recursive: true });

// sku → [shape, palette index]
const ITEMS = {
  "BD-01": ["bottle", 0], "BD-02": ["jar", 3], "BD-03": ["bottle", 4],
  "SP-01": ["tube", 5], "SP-02": ["bottle", 5], "SP-03": ["spray", 5],
  "MS-01": ["roller", 0], "MS-02": ["stone", 1], "MS-03": ["device", 2],
  "MK-01": ["lipstick", 0], "MK-02": ["mascara", 2], "MK-03": ["palette", 4],
  "HR-01": ["bottle", 2], "HR-02": ["jar", 2], "HR-03": ["dropper", 4],
  "PF-01": ["perfume", 0], "PF-02": ["perfume", 1], "PF-03": ["box", 4],
  "AP-01": ["bottle", 1], "AP-02": ["tube", 1], "AP-03": ["tube", 3],
  "GG-01": ["pack", 0], "GG-02": ["bottle", 4], "GG-03": ["pack", 2],
  "UW-01": ["box", 0], "UW-02": ["pack", 4], "UW-03": ["box", 2],
  "SO-01": ["pump", 2], "SO-02": ["bottle", 3], "SO-03": ["soap", 5],
  "HM-01": ["candle", 0], "HM-02": ["diffuser", 1], "HM-03": ["spray", 2],
  "KD-01": ["bottle", 1], "KD-02": ["tube", 5], "KD-03": ["tube", 0],
  "AC-01": ["brush", 3], "AC-02": ["scrunchies", 0], "AC-03": ["bag", 0],
  "MR-01": ["bag", 3], "MR-02": ["hoodie", 0], "MR-03": ["mug", 4],
  "GF-01": ["box", 0], "GF-02": ["box", 2], "GF-03": ["card", 4],
};

// [background top, background bottom, main, accent]
const PALETTES = [
  ["#fde8f1", "#f8c9de", "#c8135f", "#ffffff"],
  ["#e9f6ee", "#cfeadb", "#2f9e6e", "#ffffff"],
  ["#efe9fd", "#d9cdf7", "#7a55d6", "#ffffff"],
  ["#fdf0e1", "#f8d9b4", "#e08a2e", "#ffffff"],
  ["#e6f1fd", "#c7dcf6", "#3b7dd8", "#ffffff"],
  ["#fff6d8", "#fbe7a1", "#e9a800", "#ffffff"],
];

const SHAPES = {
  bottle: (m, a) => `<rect x="170" y="90" width="60" height="50" rx="10" fill="${a}"/><rect x="185" y="60" width="30" height="40" rx="8" fill="${m}"/><rect x="130" y="135" width="140" height="270" rx="34" fill="${m}"/><rect x="150" y="235" width="100" height="90" rx="10" fill="${a}" opacity=".92"/><rect x="165" y="255" width="70" height="8" rx="4" fill="${m}"/><rect x="165" y="275" width="50" height="8" rx="4" fill="${m}" opacity=".6"/>`,
  pump: (m, a) => `<rect x="185" y="50" width="70" height="18" rx="9" fill="${a}"/><rect x="190" y="65" width="20" height="60" fill="${m}"/><rect x="140" y="120" width="120" height="290" rx="30" fill="${m}"/><rect x="158" y="230" width="84" height="100" rx="10" fill="${a}" opacity=".92"/><circle cx="200" cy="280" r="20" fill="${m}" opacity=".7"/>`,
  spray: (m, a) => `<rect x="160" y="45" width="80" height="40" rx="12" fill="${a}"/><rect x="185" y="80" width="30" height="55" fill="${m}"/><rect x="140" y="130" width="120" height="280" rx="28" fill="${m}"/><rect x="158" y="230" width="84" height="100" rx="10" fill="${a}" opacity=".92"/>`,
  dropper: (m, a) => `<ellipse cx="200" cy="70" rx="26" ry="34" fill="${a}"/><rect x="175" y="95" width="50" height="40" rx="6" fill="${m}"/><rect x="140" y="130" width="120" height="280" rx="34" fill="${m}"/><rect x="158" y="240" width="84" height="90" rx="10" fill="${a}" opacity=".92"/>`,
  tube: (m, a) => `<path d="M140 110 L260 110 L246 400 L154 400 Z" fill="${m}"/><rect x="150" y="70" width="100" height="46" rx="10" fill="${a}"/><rect x="152" y="396" width="96" height="14" rx="4" fill="${a}" opacity=".85"/><rect x="165" y="200" width="70" height="90" rx="10" fill="${a}" opacity=".92"/><rect x="176" y="220" width="48" height="8" rx="4" fill="${m}"/>`,
  jar: (m, a) => `<rect x="120" y="140" width="160" height="60" rx="16" fill="${a}"/><rect x="130" y="195" width="140" height="190" rx="28" fill="${m}"/><rect x="148" y="240" width="104" height="80" rx="10" fill="${a}" opacity=".92"/><rect x="163" y="262" width="74" height="8" rx="4" fill="${m}"/>`,
  perfume: (m, a) => `<rect x="180" y="60" width="40" height="55" rx="8" fill="${m}"/><rect x="170" y="110" width="60" height="20" rx="4" fill="${a}"/><rect x="115" y="130" width="170" height="270" rx="26" fill="${m}" opacity=".9"/><rect x="132" y="150" width="136" height="230" rx="18" fill="${a}" opacity=".35"/><rect x="150" y="250" width="100" height="60" rx="8" fill="${a}"/>`,
  lipstick: (m, a) => `<rect x="165" y="80" width="70" height="120" rx="12" fill="${m}" transform="rotate(-6 200 140)"/><rect x="150" y="195" width="100" height="200" rx="14" fill="${a}"/><rect x="150" y="330" width="100" height="65" rx="14" fill="${m}"/>`,
  mascara: (m, a) => `<rect x="185" y="50" width="30" height="180" rx="10" fill="${m}"/><rect x="150" y="225" width="100" height="175" rx="18" fill="${a}"/><rect x="150" y="320" width="100" height="80" rx="18" fill="${m}"/>`,
  palette: (m, a) => `<rect x="90" y="150" width="220" height="230" rx="22" fill="${m}"/><rect x="110" y="170" width="180" height="60" rx="10" fill="${a}" opacity=".5"/>${[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${135 + c * 65}" cy="${270 + r * 25}" r="11" fill="${a}" opacity="${0.5 + ((r + c) % 3) * 0.17}"/>`)).join("")}`,
  roller: (m, a) => `<rect x="190" y="220" width="20" height="190" rx="10" fill="${a}"/><rect x="120" y="70" width="70" height="130" rx="35" fill="${m}"/><rect x="210" y="70" width="70" height="130" rx="35" fill="${m}"/><rect x="180" y="130" width="40" height="110" rx="14" fill="${a}"/>`,
  stone: (m, a) => `<path d="M110 320 Q100 170 200 130 Q300 170 290 320 Q200 380 110 320 Z" fill="${m}"/><ellipse cx="200" cy="220" rx="46" ry="28" fill="${a}" opacity=".45"/>`,
  device: (m, a) => `<rect x="150" y="90" width="100" height="300" rx="46" fill="${m}"/><circle cx="200" cy="170" r="30" fill="${a}"/><circle cx="200" cy="250" r="12" fill="${a}" opacity=".7"/><rect x="185" y="300" width="30" height="50" rx="10" fill="${a}" opacity=".6"/>`,
  pack: (m, a) => `<rect x="110" y="110" width="180" height="290" rx="22" fill="${m}"/><rect x="130" y="180" width="140" height="130" rx="14" fill="${a}" opacity=".92"/><circle cx="200" cy="245" r="32" fill="${m}" opacity=".55"/><rect x="140" y="130" width="120" height="18" rx="9" fill="${a}" opacity=".85"/>`,
  box: (m, a) => `<rect x="90" y="180" width="220" height="210" rx="18" fill="${m}"/><rect x="80" y="150" width="240" height="50" rx="14" fill="${a}" opacity=".95"/><rect x="185" y="150" width="30" height="240" fill="${a}" opacity=".9"/><path d="M200 150 C160 90 110 120 150 150 Z M200 150 C240 90 290 120 250 150 Z" fill="${a}"/>`,
  candle: (m, a) => `<path d="M200 60 C185 90 190 110 200 118 C212 108 214 88 200 60Z" fill="#ffb02e"/><rect x="196" y="112" width="8" height="26" fill="#3a2a2a"/><rect x="115" y="135" width="170" height="250" rx="24" fill="${m}"/><rect x="140" y="215" width="120" height="90" rx="10" fill="${a}" opacity=".92"/>`,
  diffuser: (m, a) => `<rect x="180" y="40" width="6" height="150" rx="3" fill="${a}" transform="rotate(-12 180 190)"/><rect x="198" y="30" width="6" height="160" rx="3" fill="${a}"/><rect x="214" y="40" width="6" height="150" rx="3" fill="${a}" transform="rotate(12 214 190)"/><rect x="170" y="180" width="60" height="30" rx="8" fill="${m}"/><rect x="120" y="205" width="160" height="200" rx="40" fill="${m}"/><rect x="145" y="270" width="110" height="70" rx="10" fill="${a}" opacity=".92"/>`,
  soap: (m, a) => `<rect x="90" y="190" width="220" height="150" rx="40" fill="${m}"/><rect x="120" y="225" width="160" height="80" rx="24" fill="${a}" opacity=".35"/><circle cx="130" cy="150" r="18" fill="${a}" opacity=".8"/><circle cx="170" cy="120" r="12" fill="${a}" opacity=".7"/><circle cx="215" cy="145" r="22" fill="${a}" opacity=".8"/>`,
  brush: (m, a) => `<rect x="180" y="210" width="40" height="200" rx="20" fill="${a}" transform="rotate(-8 200 300)"/><ellipse cx="205" cy="140" rx="70" ry="90" fill="${m}"/>${[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3].map((c) => `<circle cx="${172 + c * 22}" cy="${95 + r * 26}" r="5" fill="${a}"/>`)).join("")}`,
  scrunchies: (m, a) => `<circle cx="150" cy="200" r="60" fill="none" stroke="${m}" stroke-width="34"/><circle cx="250" cy="250" r="60" fill="none" stroke="${a}" stroke-width="34" opacity=".95"/><circle cx="190" cy="330" r="55" fill="none" stroke="${m}" stroke-width="30" opacity=".75"/>`,
  bag: (m, a) => `<path d="M150 170 C150 80 250 80 250 170" fill="none" stroke="${m}" stroke-width="12" stroke-linecap="round"/><rect x="100" y="165" width="200" height="240" rx="18" fill="${m}"/><circle cx="200" cy="275" r="38" fill="${a}" opacity=".9"/><path d="M186 275 l10 10 l20 -22" fill="none" stroke="${m}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  hoodie: (m, a) => `<path d="M120 130 L160 100 Q200 140 240 100 L280 130 L340 230 L290 260 L280 220 L280 400 L120 400 L120 220 L110 260 L60 230 Z" fill="${m}"/><path d="M160 100 Q200 140 240 100 Q200 190 160 100Z" fill="${a}" opacity=".5"/><rect x="155" y="310" width="90" height="50" rx="10" fill="${a}" opacity=".35"/>`,
  mug: (m, a) => `<rect x="110" y="150" width="170" height="220" rx="22" fill="${m}"/><path d="M280 200 C350 200 350 320 280 320" fill="none" stroke="${m}" stroke-width="22"/><rect x="135" y="215" width="120" height="70" rx="10" fill="${a}" opacity=".92"/>`,
  card: (m, a) => `<rect x="70" y="170" width="260" height="170" rx="20" fill="${m}" transform="rotate(-6 200 255)"/><circle cx="270" cy="220" r="26" fill="${a}" opacity=".9" transform="rotate(-6 200 255)"/><rect x="100" y="280" width="140" height="10" rx="5" fill="${a}" opacity=".8" transform="rotate(-6 200 255)"/>`,
};

for (const [sku, [shape, p]] of Object.entries(ITEMS)) {
  const [bg1, bg2, main, accent] = PALETTES[p];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><ellipse cx="200" cy="432" rx="120" ry="16" fill="#000" opacity=".12"/><g>${SHAPES[shape](main, accent)}</g></svg>`;
  writeFileSync(`${OUT}/demo-${sku.toLowerCase()}.svg`, svg);
}
console.log(`wrote ${Object.keys(ITEMS).length} images to ${OUT}`);
