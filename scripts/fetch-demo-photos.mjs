// Downloads the Unsplash photos used for demo products into public/demo/photos/
// and rewrites the "photo" UPDATE block at the end of supabase/demo_products.sql.
// Photos are free to use (Unsplash License). Products without a mapped photo keep
// their drawn SVG (scripts/generate-demo-images.mjs).
// Run: node scripts/fetch-demo-photos.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

// SKU (without DEMO- prefix) → Unsplash photo id
const MAP = {
  "BD-01": "20h-C0vaNBA", "BD-03": "9PnU-U7V6YE",
  "SP-01": "UYJTgxZtUmk", "SP-02": "UYJTgxZtUmk",
  "MK-01": "NnsqpLjiA94", "MK-02": "mSHRwz_FlLY", "MK-03": "5Us84s7blq8",
  "HS-01": "YwgaLtnYX4k", "HS-02": "Ui7QkgvUBZ0", "HS-03": "m3rBOi881fo",
  "HC-01": "Ui7QkgvUBZ0", "HC-02": "m3rBOi881fo",
  "HR-02": "omY18KP7_Cw", "HK-02": "omY18KP7_Cw", "HR-03": "pd4rqJMd51Q", "HR-04": "LeWrouH2qto",
  "PF-01": "W_mMinc50k8", "PF-02": "49c-5-bNCRk", "PF-03": "f94JPVrDbnY",
  "AP-02": "UYJTgxZtUmk",
  "UW-01": "Z00Dhp_tk38",
  "SO-03": "cxAZxTuL7Sk",
  "HM-01": "2QSsfflO51I", "HM-02": "n8BjsYWTH8w",
  "AC-01": "b_wK7JiEny8",
  "MR-01": "TeD4qZjGIMw", "MR-03": "AJsdrXaRhHk",
  "GF-01": "ZLTlHeKbh04", "GF-02": "f94JPVrDbnY",
  "FS-01": "pd4rqJMd51Q", "FS-02": "9PnU-U7V6YE", "FS-03": "LeWrouH2qto",
  "FC-03": "UYJTgxZtUmk",
  "FM-01": "DNohKoNoKEk",
  // Similar-category photos for everything that has no exact-match photo (demo only)
  "BD-02": "omY18KP7_Cw", "SP-03": "XanILp6v_Eg",
  "MS-01": "mSHRwz_FlLY", "MS-02": "mSHRwz_FlLY", "MS-03": "mSHRwz_FlLY",
  "HS-04": "nl3uvcm1w5M", "HC-03": "nl3uvcm1w5M", "HK-01": "omY18KP7_Cw", "HK-03": "omY18KP7_Cw",
  "AP-01": "20h-C0vaNBA", "AP-03": "UYJTgxZtUmk",
  "GG-01": "cxAZxTuL7Sk", "GG-02": "nl3uvcm1w5M", "GG-03": "cxAZxTuL7Sk",
  "UW-02": "Z00Dhp_tk38", "UW-03": "Z00Dhp_tk38",
  "SO-01": "nl3uvcm1w5M", "SO-02": "YwgaLtnYX4k",
  "HM-03": "7JxP1pYYIUo",
  "KD-01": "Ui7QkgvUBZ0", "KD-02": "lpFTFW9BZSU", "KD-03": "ED3F5UhUv5s",
  "AC-02": "I7C5S7868Jk", "AC-03": "rO20Sn1FWo4",
  "MR-02": "g5GXUqF_QDI", "GF-03": "ZLTlHeKbh04",
  "FF-01": "UYJTgxZtUmk", "FF-02": "20h-C0vaNBA", "FF-03": "XanILp6v_Eg",
  "FC-01": "omY18KP7_Cw", "FC-02": "lpFTFW9BZSU", "FC-04": "XanILp6v_Eg",
  "FS-04": "9PnU-U7V6YE", "FM-02": "2bQ82FvUAFg",
};

const DIR = "public/demo/photos";
mkdirSync(DIR, { recursive: true });
for (const id of new Set(Object.values(MAP))) {
  const file = `${DIR}/${id}.jpg`;
  if (existsSync(file)) continue;
  execFileSync("curl", ["-sL", "-m", "60", "-A", "Mozilla/5.0", "-o", file, `https://unsplash.com/photos/${id}/download?force=true&w=800`]);
  console.log("downloaded", id);
}

const p = "supabase/demo_products.sql";
let s = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const marker = "\n-- Фото (Unsplash)";
if (s.includes(marker)) s = s.slice(0, s.indexOf(marker));
const byPhoto = new Map();
for (const [sku, id] of Object.entries(MAP)) byPhoto.set(id, [...(byPhoto.get(id) ?? []), `DEMO-${sku}`]);
s = s.trimEnd() + "\n" + marker + " — у товаров ниже настоящие фото, у остальных нарисованные картинки\n";
for (const [id, skus] of byPhoto) {
  s += `update products set image_url = '/demo/photos/${id}.jpg' where sku in (${skus.map((k) => `'${k}'`).join(", ")});\n`;
}
writeFileSync(p, s);
console.log("photos:", byPhoto.size, "products:", Object.keys(MAP).length);
