// Splits the logo into transparent layers (emblem + 5 text/divider bands) for the animated splash (AppSplashGate).
// Geometry below is in source pixels (832x1248); AppSplashGate positions layers in % of that box, keep both in sync.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "design/logo-drafts/1-new-logo.jpg";
const BG = [201, 22, 77];
const W = 832;
const PAD = 14;
const LAYERS = [
  { name: "l1", left: 0, top: 731 - PAD, width: W, height: 92 + PAD * 2 },
  { name: "l2", left: 0, top: 845 - PAD, width: W, height: 46 + PAD * 2 },
  { name: "l3", left: 0, top: 916 - PAD, width: W, height: 71 + PAD * 2 },
  { name: "l4", left: 0, top: 1021 - PAD, width: W, height: 44 + PAD * 2 },
  { name: "l5", left: 0, top: 1094 - PAD, width: W, height: 56 + PAD * 2 },
];

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

mkdirSync("public/brand/splash", { recursive: true });
for (const { name, ...box } of LAYERS) {
  const { data, info } = await sharp(SRC).extract(box).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    const px = [0, 1, 2].map((c) => data[p * info.channels + c]);
    const dist = Math.max(...px.map((v, c) => Math.abs(v - BG[c])));
    const a = smooth(14, 70, dist);
    for (let c = 0; c < 3; c++) {
      out[p * 4 + c] = a > 0.02 ? Math.min(255, Math.max(0, Math.round(BG[c] + (px[c] - BG[c]) / a))) : 255;
    }
    out[p * 4 + 3] = Math.round(a * 255);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 95 })
    .toFile(`public/brand/splash/${name}.webp`);
  console.log(name, box);
}

// ---- Эмблема по частям для анимации (AnimatedLogo): M, помада, белые дуги кольца, розовые лепестки.
// Части отделены друг от друга тёмными зазорами — находим их как связные области и раскладываем по слоям.
// Все слои одного размера и лежат друг на друге без смещения; emblem.webp — целиком (маска для блика).
const EMB = { left: 166, top: 97, width: 501, height: 598 };
{
  const { data, info } = await sharp(SRC).extract(EMB).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const dist = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) dist[p] = Math.max(...[0, 1, 2].map((c) => Math.abs(data[p * ch + c] - BG[c])));

  const label = new Int32Array(w * h);
  const comps = [];
  for (let start = 0; start < w * h; start++) {
    if (dist[start] <= 40 || label[start]) continue;
    const id = comps.length + 1;
    const c = { id, size: 0, x0: w, y0: h, x1: 0, y1: 0, g: 0 };
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      c.size++; c.g += data[p * ch + 1];
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (dist[np] > 40 && !label[np]) { label[np] = id; stack.push(np); }
      }
    }
    c.g /= c.size;
    comps.push(c);
  }
  const real = comps.filter((c) => c.size > 150);

  const groupOf = (c) => {
    const cx = (c.x0 + c.x1) / 2;
    if (c.size > 20000 && c.y1 > 500 && cx > 200 && cx < 300) return "m";
    if (cx > 200 && cx < 330 && c.y1 <= 400) return "lipstick";
    return c.g >= 225 ? "ring" : "petals";
  };
  const groupByLabel = new Map(real.map((c) => [c.id, groupOf(c)]));
  const counts = {};
  for (const g of groupByLabel.values()) counts[g] = (counts[g] ?? 0) + 1;
  console.log("emblem parts", counts);
  if (counts.m !== 1 || counts.lipstick !== 4 || counts.ring !== 2 || counts.petals !== 5) {
    throw new Error("Эмблема разобралась на части не так, как ожидалось — проверьте исходник и пороги");
  }

  // Расширяем каждую часть на 3 px, чтобы взять сглаженный край; зазоры между частями шире.
  const grow = (inGroup) => {
    const mask = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) if (inGroup(p)) mask[p] = 1;
    const out = new Uint8Array(mask);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) continue;
      near: for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) { out[y * w + x] = 1; break near; }
      }
    }
    return out;
  };

  const write = async (name, allowed) => {
    const out = Buffer.alloc(w * h * 4);
    for (let p = 0; p < w * h; p++) {
      const a = allowed ? smooth(14, 70, dist[p]) * (allowed[p] ? 1 : 0) : smooth(14, 70, dist[p]);
      for (let c = 0; c < 3; c++) {
        const v = data[p * ch + c];
        out[p * 4 + c] = a > 0.02 ? Math.min(255, Math.max(0, Math.round(BG[c] + (v - BG[c]) / a))) : 255;
      }
      out[p * 4 + 3] = Math.round(a * 255);
    }
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`public/brand/splash/${name}.webp`);
    console.log(name);
  };
  await write("emblem", null);
  for (const g of ["m", "lipstick", "ring", "petals"]) {
    await write(`emblem-${g}`, grow((p) => groupByLabel.get(label[p]) === g));
  }
}
