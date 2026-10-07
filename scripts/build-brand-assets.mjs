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
  { size: 1024, out: "assets/icon.png" }, // Capacitor (iOS)
];
for (const { size, out } of icons) {
  await (await emblem(size)).toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}


// Android: адаптивная иконка = передний план + фон, система вырезает из неё круг/«квадрат со скруглением».
// Эмблема должна лежать в «безопасной зоне» (~66% холста), иначе острие помады обрежется — поэтому уменьшаем до 62%.
// Берём эмблему с прозрачным фоном (public/brand/splash/emblem.webp — её делает build-splash-layers.mjs), чтобы вокруг
// не было еле заметной рамки от чуть иного оттенка розового.
const FG_HEIGHT = Math.round(1024 * 0.62);
const emblemKeyed = await sharp("public/brand/splash/emblem.webp").resize({ height: FG_HEIGHT }).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: emblemKeyed, gravity: "center" }])
  .png()
  .toFile("assets/icon-foreground.png");
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: BG } }).png().toFile("assets/icon-background.png");
console.log("wrote assets/icon-foreground.png, assets/icon-background.png");

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
