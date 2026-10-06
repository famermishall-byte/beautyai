// Asset pipeline: takes the owner's new logo (design/logo-drafts/1-new-logo.jpg, 832x1248, 05.10) and produces
// every file the app references:
//  - icons (favicon, apple-icon, PWA, Capacitor, in-app badge) = the round emblem (lipstick + M) cropped from the logo
//  - splash (web AppSplashGate + Capacitor) = the whole logo with the store name
// Background of every file is the logo's own pink so there is no visible seam.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "design/logo-drafts/1-new-logo.jpg";
const BG = { r: 201, g: 22, b: 77 }; // sampled from the logo corners

mkdirSync("public/brand", { recursive: true });

// Square crop around the emblem; the store-name text starts at y≈730, so stay above it.
const EMBLEM = { left: 88, top: 65, width: 660, height: 660 };

async function emblem(size) {
  return sharp(SRC).extract(EMBLEM).resize(size, size).png();
}

const icons = [
  { size: 256, out: "public/brand/mark.png" }, // BrandMark.tsx (login badge)
  { size: 512, out: "src/app/icon.png" },
  { size: 180, out: "src/app/apple-icon.png" },
  { size: 512, out: "public/icon-512.png" }, // PWA manifest
  { size: 1024, out: "assets/icon.png" }, // Capacitor
  { size: 1024, out: "assets/icon-foreground.png" },
];
for (const { size, out } of icons) {
  await (await emblem(size)).toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}

// Whole logo for the in-app splash (AppSplashGate). Webp keeps it light for a screen shown on every app open.
await sharp(SRC).resize({ width: 832 }).webp({ quality: 88 }).toFile("public/brand/splash.webp");
console.log("wrote public/brand/splash.webp");

// Capacitor native splash: logo centered on the same pink, generous margin around it.
const SPLASH = 2732;
const logoH = Math.round(SPLASH * 0.62);
const logoBuf = await sharp(SRC).resize({ height: logoH }).png().toBuffer();
for (const out of ["assets/splash.png", "assets/splash-dark.png"]) {
  await sharp({ create: { width: SPLASH, height: SPLASH, channels: 4, background: BG } })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out, `${SPLASH}x${SPLASH}`);
}
