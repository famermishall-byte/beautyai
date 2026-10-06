// Splits the logo into transparent layers (emblem + 5 text/divider bands) for the animated splash (AppSplashGate).
// Geometry below is in source pixels (832x1248); AppSplashGate positions layers in % of that box, keep both in sync.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "design/logo-drafts/1-new-logo.jpg";
const BG = [201, 22, 77];
const W = 832;
const PAD = 14;
const LAYERS = [
  { name: "emblem", left: 166, top: 97, width: 501, height: 598 },
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
