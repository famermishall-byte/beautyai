// One-off asset pipeline: takes the client's original logo photo
// (design/logo-drafts/0-reference.jpg, 223x233) and produces the square,
// properly sized files the app actually references. Source is small/JPEG,
// so anything above ~500px is an upscale and will look a bit soft — accepted
// tradeoff per user decision (2026-09-20) to use the real logo over a
// hand-redrawn SVG approximation.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "design/logo-drafts/0-reference.jpg";
const ACCENT = "#c8135f";

mkdirSync("public/brand", { recursive: true });

// The source is a JPEG (magenta bg baked in, with compression noise) — key
// out the magenta so we get a clean transparent-background ring mark, instead
// of compositing "square with its own baked-in bg" onto another background
// (that left a visible seam where the two magentas didn't quite match).
async function extractMask() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  const LOW = 130; // below: fully transparent (background)
  const HIGH = 210; // above: fully opaque white (the ring/number)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const brightness = Math.min(r, g, b);
    const alpha = Math.max(0, Math.min(255, Math.round(((brightness - LOW) / (HIGH - LOW)) * 255)));
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = alpha;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

const maskBuf = await extractMask();

// Transparent-background square version of just the ring mark, reused below.
async function squareMask(targetSize) {
  return sharp(maskBuf).resize({
    width: targetSize,
    height: targetSize,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
}

// Mark on a solid accent-color square (favicons, in-app badge, PWA icon, Capacitor icon).
async function markOnAccent(targetSize) {
  const mask = await (await squareMask(targetSize)).toBuffer();
  return sharp({
    create: { width: targetSize, height: targetSize, channels: 4, background: ACCENT },
  }).composite([{ input: mask }]);
}

const jobs = [
  // In-app <img> source for BrandMark.tsx (login badge, splash badge)
  { size: 256, out: "public/brand/mark.png" },
  // Next.js static metadata icon conventions
  { size: 512, out: "src/app/icon.png" },
  { size: 180, out: "src/app/apple-icon.png" },
  // PWA manifest icon
  { size: 512, out: "public/icon-512.png" },
  // Capacitor native icon source (capacitor-assets wants >=1024; this is
  // upscaled ~4.6x from the 223px original, will look soft close-up)
  { size: 1024, out: "assets/icon.png" },
  { size: 1024, out: "assets/icon-foreground.png" },
];

for (const { size, out } of jobs) {
  const img = await markOnAccent(size);
  await img.png().toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}

// Capacitor native splash screen (shown before the JS app loads). These were
// still the pre-rebrand brown "B" placeholder — never updated during the
// 15.09 rebrand. App has no real distinct dark theme, so light/dark share
// the same design: mark centered on a plain accent-color canvas, smaller
// than the app icon (splash conventionally has generous surrounding margin).
const SPLASH_SIZE = 1024;
const markForSplash = await (await squareMask(Math.round(SPLASH_SIZE * 0.42))).toBuffer();

for (const out of ["assets/splash.png", "assets/splash-dark.png"]) {
  await sharp({
    create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: ACCENT },
  })
    .composite([{ input: markForSplash, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out, `${SPLASH_SIZE}x${SPLASH_SIZE}`);
}
