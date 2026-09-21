// Builds supabase/section_lists.sql — ADDITIVE demo data for the third-level lists inside
// "Уход за кожей" sections (Уход для лица → Умывание, Сыворотки, Пэды…):
//   1. merges `tags` / `oldPrice` / `hit` into attributes of EXISTING demo products;
//   2. inserts NEW demo products for the sub-sections that had none (only if the sku is absent).
// Nothing is deleted or overwritten; safe to run more than once.
// Run: node scripts/generate-section-lists-sql.mjs
import { writeFileSync } from "node:fs";

const ALL = ["dry", "oily", "combination", "normal", "sensitive"];
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

// ---- 1. existing demo products: sku → { tags, old (old-price factor), hit }
const EXISTING = {
  "FF-01": { tags: ["cleansing"] },
  "FF-02": { tags: ["cleansing", "makeup-removal"], old: 1.5 },
  "FF-03": { tags: ["cleansing"], hit: true, old: 1.7 },
  "FC-01": { tags: ["cream"], hit: true, old: 1.8 },
  "FC-02": { tags: ["cream", "antiage"], old: 1.6 },
  "FC-03": { tags: ["cream", "problem"] },
  "FC-04": { tags: ["body-hands"], old: 1.4 },
  "FS-01": { tags: ["serum", "antiage"], hit: true, old: 2.1 },
  "FS-02": { tags: ["serum"], old: 1.7 },
  "FS-03": { tags: ["serum", "problem"], hit: true, old: 2.4 },
  "FS-04": { tags: ["serum", "antiage"], old: 1.9 },
  "FM-01": { tags: ["mask"], hit: true, old: 1.5 },
  "FM-02": { tags: ["mask", "problem"] },
  "AP-01": { tags: ["cleansing", "makeup-removal"] },
  "AP-02": { tags: ["cream"], old: 1.6 },
  "AP-03": { tags: ["problem"], hit: true, old: 1.8 },
  "BD-01": { tags: ["body-cream"], old: 1.5 },
  "BD-02": { tags: ["body-scrub"], hit: true, old: 1.7 },
  "BD-03": { tags: ["body-oil"], old: 1.6 },
  "SP-01": { tags: ["spf-face"], hit: true, old: 1.8 },
  "SP-02": { tags: ["spf-face", "spf-spray"], old: 1.5 },
  "SP-03": { tags: ["spf-body", "spf-spray"], old: 1.6 },
  "MS-01": { tags: ["massage-face"], hit: true, old: 1.7 },
  "MS-02": { tags: ["massage-face"], old: 1.5 },
  "MS-03": { tags: ["massage-body"], old: 1.8 },
};

// ---- 2. new demo products
// [sku, name, brand, category, price, description, characteristics, purpose, tags, productType, volume, skinType, photoId, oldFactor, hit]
const NEW = [
  ["MN-01", "Патчи с микроиглами для морщин", "Seoul Skin", "Сыворотки", 1290, "Микроиглы из гиалуроновой кислоты для разглаживания морщин.", "Гиалуроновая кислота, 10 пар", "Зрелая кожа", ["microneedle", "antiage"], "Средство с микроиглами", "10 пар", ["normal", "dry"], "9PnU-U7V6YE", 2.3, true],
  ["MN-02", "Микроигольные патчи от воспалений", "Seoul Skin", "Сыворотки", 890, "Точечно убирают воспаления за ночь.", "Салициловая кислота, 12 патчей", "Проблемная кожа", ["microneedle", "problem"], "Средство с микроиглами", "12 шт", ["oily", "combination"], "2bQ82FvUAFg", 1.9, false],
  ["PD-01", "Сыворотка с ПДРН «Salmon»", "Seoul Skin", "Сыворотки", 1850, "Восстанавливающая сыворотка с ПДРН.", "ПДРН 2%, пантенол", "Уставшая кожа", ["pdrn", "serum", "antiage"], "Сыворотка с ПДРН", "30 мл", ["normal", "dry", "sensitive"], "pd4rqJMd51Q", 2.2, true],
  ["PD-02", "Ампула с ПДРН и центеллой", "Dermalux", "Сыворотки", 1590, "Ампула для восстановления кожи после процедур.", "ПДРН, центелла", "Чувствительная кожа", ["pdrn", "serum"], "Сыворотка с ПДРН", "30 мл", ["sensitive", "dry"], "LeWrouH2qto", 1.8, false],
  ["TN-01", "Тонер увлажняющий с гиалуроновой кислотой", "Seoul Skin", "Тоники", 780, "Увлажняет и готовит кожу к уходу.", "Гиалуроновая кислота, алоэ", "Все типы кожи", ["toner"], "Тонер", "200 мл", ALL, "20h-C0vaNBA", 1.7, true],
  ["TN-02", "Тонер-баланс для жирной кожи", "Dermalux", "Тоники", 720, "Регулирует жирность, сужает поры.", "Ниацинамид, цинк", "Жирная и комбинированная кожа", ["toner", "problem"], "Тонер", "200 мл", ["oily", "combination"], "9PnU-U7V6YE", 1.5, false],
  ["TN-03", "Лосьон успокаивающий с центеллой", "Seoul Skin", "Тоники", 850, "Успокаивает раздражения и покраснения.", "Центелла, пантенол", "Чувствительная кожа", ["toner"], "Лосьон", "150 мл", ["sensitive", "dry"], "20h-C0vaNBA", 1.6, false],
  ["SC-01", "Пилинг-скатка с AHA-кислотами", "Dermalux", "Уход за лицом", 690, "Мягко отшелушивает и выравнивает тон.", "AHA-кислоты, папайя", "Тусклая кожа", ["scrub"], "Пилинг", "100 мл", ["normal", "combination", "oily"], "omY18KP7_Cw", 1.6, false],
  ["SC-02", "Скраб для лица кофейный", "Silk Lab", "Уход за лицом", 540, "Деликатно очищает поры.", "Кофе, масло ши", "Нормальная кожа", ["scrub"], "Скраб", "75 мл", ["normal", "dry"], "omY18KP7_Cw", 1.4, false],
  ["PA-01", "Тонер-пэды с кислотами, 60 шт", "Seoul Skin", "Уход за лицом", 1190, "Отшелушивающие пэды для домашнего ухода.", "PHA/AHA, 60 пэдов", "Тусклая кожа", ["pad"], "Пэды", "60 шт", ["normal", "oily", "combination"], "2bQ82FvUAFg", 2.0, true],
  ["PA-02", "Успокаивающие пэды с центеллой", "Seoul Skin", "Уход за лицом", 990, "Снимают покраснения, увлажняют.", "Центелла, 70 пэдов", "Чувствительная кожа", ["pad"], "Пэды", "70 шт", ["sensitive", "dry"], "2bQ82FvUAFg", 1.7, false],
  ["EY-01", "Крем для кожи вокруг глаз с пептидами", "Dermalux", "Уход за глазами", 1150, "Уменьшает тёмные круги и мелкие морщины.", "Пептиды, кофеин", "Зрелая кожа", ["eye", "antiage"], "Крем для глаз", "20 мл", ["normal", "dry"], "lpFTFW9BZSU", 2.0, true],
  ["EY-02", "Гель для век охлаждающий", "Glow Co", "Уход за глазами", 780, "Снимает отёчность и усталость.", "Алоэ, огуречный экстракт", "Уставшие глаза", ["eye"], "Гель для век", "15 мл", ALL, "XanILp6v_Eg", 1.5, false],
  ["LP-01", "Бальзам для губ «Вишня»", "Silk Lab", "Уход за лицом", 290, "Питает и защищает губы.", "Масло ши, пчелиный воск", "Сухие губы", ["lips"], "Бальзам для губ", "10 г", [], "NnsqpLjiA94", 1.4, true],
  ["LP-02", "Маска для губ ночная", "Seoul Skin", "Уход за лицом", 520, "Интенсивное питание губ за ночь.", "Керамиды, масло ши", "Потрескавшиеся губы", ["lips"], "Маска для губ", "8 г", [], "NnsqpLjiA94", 1.6, false],
  ["PT-01", "Гидрогелевые патчи под глаза, 60 шт", "Seoul Skin", "Уход за глазами", 950, "Охлаждают и уменьшают отёки.", "Коллаген, золото, 60 шт", "Уставшая кожа", ["patch", "eye"], "Патчи", "60 шт", ALL, "2bQ82FvUAFg", 2.1, true],
  ["PT-02", "Патчи от акне «Точка»", "Dermalux", "Уход за лицом", 420, "Прозрачные патчи на воспаления.", "Гидроколлоид, 36 шт", "Проблемная кожа", ["patch", "problem"], "Патчи", "36 шт", ["oily", "combination"], "2bQ82FvUAFg", 1.5, false],
  ["PT-03", "Патчи для носогубных складок", "Seoul Skin", "Уход за лицом", 880, "Разглаживающие патчи с гиалуроновой кислотой.", "Гиалуроновая кислота, 10 пар", "Зрелая кожа", ["patch", "antiage"], "Патчи", "10 пар", ["normal", "dry"], "2bQ82FvUAFg", 1.8, false],
  ["CL-01", "Антицеллюлитный гель-крем", "Body Flow", "Уход для тела", 990, "Разогревающий гель для проблемных зон.", "Кофеин, перец", "Антицеллюлитный уход", ["body-anticellulite"], "Антицеллюлитный гель", "200 мл", [], "20h-C0vaNBA", 1.7, true],
  ["CL-02", "Антицеллюлитное масло для массажа", "Body Flow", "Уход для тела", 1190, "Масло для массажа бёдер и ягодиц.", "Масло грейпфрута, розмарин", "Антицеллюлитный уход", ["body-anticellulite", "body-oil"], "Масло для тела", "150 мл", [], "pd4rqJMd51Q", 1.6, false],
  ["FT-01", "Крем для ног смягчающий", "Silk Lab", "Уход для тела", 460, "Смягчает пятки и снимает усталость.", "Мочевина 10%, мята", "Сухая кожа ног", ["body-feet"], "Крем для ног", "100 мл", [], "XanILp6v_Eg", 1.5, false],
  ["FT-02", "Пилинг-носочки для ног", "Seoul Skin", "Уход для тела", 690, "Домашний педикюр за 60 минут.", "Кислоты, 1 пара", "Огрубевшая кожа стоп", ["body-feet", "body-scrub"], "Пилинг для ног", "1 пара", [], "2bQ82FvUAFg", 1.8, true],
  ["HN-01", "Крем для рук с гиалуроновой кислотой", "Glow Co", "Уход для тела", 380, "Увлажняющий крем, быстро впитывается.", "Гиалуроновая кислота, 75 мл", "Сухая кожа рук", ["body-hands"], "Крем для рук", "75 мл", [], "XanILp6v_Eg", 1.5, false],
  ["BC-01", "Молочко для тела питательное", "Silk Lab", "Уход для тела", 640, "Питание и мягкость на весь день.", "Масло ши, витамин E", "Сухая кожа тела", ["body-cream"], "Молочко для тела", "300 мл", [], "20h-C0vaNBA", 1.6, false],
  ["SS-01", "Солнцезащитный стик SPF 50", "Sun Guard", "SPF", 890, "Удобный стик для лица и зоны вокруг глаз.", "SPF 50, PA++++", "Защита в течение дня", ["spf-face", "spf-stick"], "Солнцезащитный стик", "18 г", ALL, "UYJTgxZtUmk", 1.6, false],
];

let sql = `-- Демо-данные для списков подразделов внутри «Ухода за кожей» (Уход для лица → Умывание, Сыворотки…).
-- ТОЛЬКО ДОБАВЛЯЕТ: дописывает теги/старые цены/«Хит» в характеристики существующих товаров и
-- добавляет новые демо-товары для пустых подразделов. Ничего не удаляет и не перезаписывает.
-- Запустить в Supabase → SQL Editor (можно повторно). Сначала должна быть выполнена product_attributes.sql.

`;
for (const [sku, e] of Object.entries(EXISTING)) {
  const parts = [`'tags', ${q(JSON.stringify(e.tags))}::jsonb`];
  if (e.old) parts.push(`'oldPrice', round(price * ${e.old} / 10) * 10`);
  if (e.hit) parts.push(`'hit', true`);
  sql += `update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object(${parts.join(", ")}) where sku = ${q("DEMO-" + sku)};\n`;
}
sql += "\n";
for (const [sku, name, brand, category, price, desc, chars, purpose, tags, productType, volume, skin, photo, old, hit] of NEW) {
  const attrs = { productType, volume, tags };
  if (skin.length) attrs.skinType = skin;
  if (hit) attrs.hit = true;
  const oldExpr = old ? ` || jsonb_build_object('oldPrice', round(${price} * ${old} / 10) * 10)` : "";
  sql += `insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), ${q("DEMO-" + sku)}, ${q(name)}, ${q(brand)}, ${q(category)}, ${price}, ${q(desc)}, ${q(chars)}, ${q(purpose)}, true, ${q("/demo/photos/" + photo + ".jpg")}, ${q(JSON.stringify(attrs))}::jsonb${oldExpr}
where not exists (select 1 from products where sku = ${q("DEMO-" + sku)});\n`;
}
writeFileSync("supabase/section_lists.sql", sql);
console.log("existing:", Object.keys(EXISTING).length, "new:", NEW.length);
