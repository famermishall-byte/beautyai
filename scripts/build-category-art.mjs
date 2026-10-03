// Картинки категорий каталога: исходники из design/category-art/ (товар на белом фоне или PNG с прозрачностью)
// → public/brand/categories/<имя>.webp с прозрачным фоном, обрезанные по предмету, высотой 360 px.
// Запуск: node scripts/build-category-art.mjs
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "design/category-art";
const OUT = "public/brand/categories";
const HEIGHT = 360;
// Фон — почти белые и бесцветные точки, связанные с краем кадра (белые крышки внутри предмета не трогаем).
const WHITE_MIN = 236;
const MAX_TINT = 14;

async function cutOut(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const hasAlpha = (() => {
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
    return false;
  })();
  if (!hasAlpha) {
    const isBg = (p) => {
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      return Math.min(r, g, b) >= WHITE_MIN && Math.max(r, g, b) - Math.min(r, g, b) <= MAX_TINT;
    };
    const seen = new Uint8Array(w * h);
    const stack = [];
    const push = (p) => {
      if (!seen[p] && isBg(p)) {
        seen[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < w; x++) (push(x), push((h - 1) * w + x));
    for (let y = 0; y < h; y++) (push(y * w), push(y * w + w - 1));
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (p >= w) push(p - w);
      if (p < w * (h - 1)) push(p + w);
    }
    for (let p = 0; p < w * h; p++) if (seen[p]) data[p * 4 + 3] = 0;
  }
  // лёгкое сглаживание края маски, чтобы не было «лесенки»
  const alpha = Buffer.alloc(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = data[p * 4 + 3];
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  for (let p = 0; p < w * h; p++) data[p * 4 + 3] = Math.min(data[p * 4 + 3], soft[p]);
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

await mkdir(OUT, { recursive: true });
for (const name of (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
  const out = path.join(OUT, `${path.parse(name).name}.webp`);
  const cut = await cutOut(path.join(SRC, name));
  const trimmed = await sharp(await cut.png().toBuffer()).trim({ threshold: 1 }).toBuffer();
  const info = await sharp(trimmed).resize({ height: HEIGHT }).webp({ quality: 86, alphaQuality: 90 }).toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
