// Builds the catalog structure JSON (for the app) and an ADDITIVE demo-data SQL from scripts/catalog-data.mjs.
// Also downloads any missing demo photos and REFUSES to finish if a sub-category would be empty.
// Run: node scripts/build-catalog.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { GROUPS, POOLS, RETAG } from "./catalog-data.mjs";

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const MIN = 3;

// ---- what already exists in the database (from the SQL files that were run)
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const existingCat = new Map(); // sku (no DEMO-) → category
const rowRe = /'DEMO-([A-Z]{2}-\d\d)',\s*'(?:[^']|'')*',\s*'(?:[^']|'')*',\s*'((?:[^']|'')*)',\s*\d+/g;
for (const file of ["supabase/demo_products.sql", "supabase/section_lists.sql"]) {
  for (const m of read(file).matchAll(rowRe)) existingCat.set(m[1], m[2].replace(/''/g, "'"));
}
const existingHair = new Map(); // sku → hairType[]
for (const m of read("supabase/product_attributes.sql").matchAll(/'(\{[^\n]*\})'::jsonb where sku = 'DEMO-([A-Z]{2}-\d\d)'/g)) {
  const a = JSON.parse(m[1]);
  if (a.hairType) existingHair.set(m[2], a.hairType);
}

// ---- validate: no empty sub-categories, every existing product has tags
const missingTags = [...existingCat.keys()].filter((k) => !RETAG[k]);
if (missingTags.length) throw new Error("existing products without tags: " + missingTags.join(","));

let problems = 0;
const total = { subs: 0, newProducts: 0 };
for (const g of GROUPS) {
  for (const s of g.subs) {
    total.subs++;
    let count = 0;
    if (s.attr) {
      const want = s.attr.hairType;
      count += [...existingHair].filter(([k, h]) => h.includes(want) && g.categories.includes(existingCat.get(k))).length;
      count += g.subs.flatMap((x) => (x.hair?.includes(want) ? x.items : [])).length;
    } else {
      count += Object.entries(RETAG).filter(([k, tags]) => tags.includes(s.tag) && g.categories.includes(existingCat.get(k))).length;
      count += s.items.length;
    }
    if (count < MIN) {
      problems++;
      console.log(`✗ ${g.name} → ${s.label}: ${count} (< ${MIN})`);
    }
  }
}
if (problems) throw new Error(problems + " sub-categories have too few products");

// ---- app structure
const structure = {
  groups: GROUPS.map((g) => ({
    name: g.name,
    ...(g.label ? { label: g.label } : {}),
    icon: g.icon,
    categories: g.categories,
    subs: g.subs.map((s) => ({ label: s.label, ...(s.attr ? { attr: s.attr } : { tag: s.tag }) })),
  })),
};
writeFileSync("src/lib/catalog-structure.json", JSON.stringify(structure, null, 2) + "\n");

// ---- SQL
let sql = `-- Структура каталога: теги подкатегорий для существующих демо-товаров + новые демо-товары,
-- чтобы НИ ОДНА подкатегория не была пустой (Каталог → категория → подкатегория → товары).
-- ТОЛЬКО ДОБАВЛЯЕТ: существующие товары, фото, цены и названия не меняются (в характеристики
-- дописываются только теги подкатегорий). Новые товары вставляются, только если артикула ещё нет.
-- Запустить в Supabase → SQL Editor (можно повторно). Требует product_attributes.sql.

`;
for (const [sku, tags] of Object.entries(RETAG)) {
  sql += `update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', ${q(JSON.stringify(tags))}::jsonb) where sku = ${q("DEMO-" + sku)};\n`;
}
sql += "\n";

const photos = new Set();
let n = 0;
GROUPS.forEach((g, gi) =>
  g.subs.forEach((s, si) =>
    s.items.forEach(([name, brand, price, volume], ni) => {
      const pool = POOLS[s.pool];
      const photo = pool[ni % pool.length];
      photos.add(photo);
      const sku = `DEMO-N${String(gi).padStart(2, "0")}${String(si).padStart(2, "0")}${ni + 1}`;
      const attrs = { productType: s.label, tags: [s.tag] };
      if (volume) attrs.volume = volume;
      const skin = s.skin ?? g.skin;
      if (skin?.length) attrs.skinType = skin;
      if (s.hair?.length) attrs.hairType = s.hair;
      if (n % 5 === 1) attrs.hit = true;
      const old = n % 3 === 0 ? 1.4 + (n % 5) * 0.2 : 0;
      const oldExpr = old ? ` || jsonb_build_object('oldPrice', round(${price} * ${old.toFixed(1)} / 10) * 10)` : "";
      const cat = s.cat ?? g.cat;
      sql += `insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), ${q(sku)}, ${q(name)}, ${q(brand)}, ${q(cat)}, ${price}, ${q(s.blurb)}, ${q([s.chars, volume].filter(Boolean).join(", "))}, ${q(s.purpose)}, true, ${q("/demo/photos/" + photo + ".jpg")}, ${q(JSON.stringify(attrs))}::jsonb${oldExpr}
where not exists (select 1 from products where sku = ${q(sku)});\n`;
      n++;
    })
  )
);
total.newProducts = n;
writeFileSync("supabase/catalog_structure.sql", sql);

// ---- photos
mkdirSync("public/demo/photos", { recursive: true });
for (const id of photos) {
  const file = `public/demo/photos/${id}.jpg`;
  if (existsSync(file)) continue;
  execFileSync("curl", ["-sL", "-m", "60", "-A", "Mozilla/5.0", "-o", file, `https://unsplash.com/photos/${id}/download?force=true&w=800`]);
  console.log("downloaded", id);
}
console.log(`groups: ${GROUPS.length}, sub-categories: ${total.subs}, new demo products: ${total.newProducts}, photos used: ${photos.size}`);
