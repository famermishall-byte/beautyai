// Builds supabase/product_attributes.sql: an ADDITIVE migration that adds the
// products.attributes jsonb column and fills it for the demo products.
// Nothing is deleted or re-inserted, so product ids, photos, prices and carts stay intact.
// Run: node scripts/generate-attributes-sql.mjs
import { writeFileSync } from "node:fs";

const ALL = ["dry", "oily", "combination", "normal", "sensitive"];

// sku (without DEMO-) → [productType, volume, hairType[], skinType[]]
// hairType keys: dry | oily | normal | damaged | colored
// skinType keys: dry | oily | combination | normal | sensitive
const DATA = {
  // Лицо
  "FF-01": ["Гель для умывания", "150 мл", [], ALL],
  "FF-02": ["Мицеллярная вода", "250 мл", [], ALL],
  "FF-03": ["Пенка для умывания", "150 мл", [], ["sensitive", "normal"]],
  "FC-01": ["Крем", "50 мл", [], ["dry"]],
  "FC-02": ["Ночной крем", "50 мл", [], ["normal", "dry"]],
  "FC-03": ["Крем-гель", "50 мл", [], ["oily", "combination"]],
  "FC-04": ["Крем для рук", "75 мл", [], []],
  "FS-01": ["Сыворотка", "30 мл", [], ["normal", "dry", "combination"]],
  "FS-02": ["Сыворотка", "30 мл", [], ["dry", "sensitive"]],
  "FS-03": ["Сыворотка", "30 мл", [], ["oily", "combination"]],
  "FS-04": ["Сыворотка", "30 мл", [], ["normal", "dry"]],
  "FM-01": ["Тканевая маска", "5 шт", [], ALL],
  "FM-02": ["Глиняная маска", "100 мл", [], ["oily", "combination"]],
  "SP-01": ["Солнцезащитный крем", "50 мл", [], ALL],
  "SP-02": ["Солнцезащитный флюид", "40 мл", [], ["oily", "combination"]],
  "SP-03": ["Солнцезащитный спрей", "150 мл", [], []],
  "AP-01": ["Мицеллярная вода", "250 мл", [], ["sensitive"]],
  "AP-02": ["Крем", "50 мл", [], ["sensitive", "dry"]],
  "AP-03": ["Гель против акне", "30 мл", [], ["oily", "combination"]],
  // Тело
  "BD-01": ["Лосьон для тела", "250 мл", [], []],
  "BD-02": ["Скраб для тела", "200 г", [], []],
  "BD-03": ["Масло для тела", "100 мл", [], []],
  "MS-01": ["Роллер для лица", "", [], []],
  "MS-02": ["Гуаша", "", [], []],
  "MS-03": ["Массажёр для тела", "", [], []],
  // Волосы
  "HS-01": ["Шампунь", "250 мл", ["dry", "damaged"], []],
  "HS-02": ["Шампунь", "250 мл", ["dry"], []],
  "HS-03": ["Шампунь", "250 мл", ["oily"], []],
  "HS-04": ["Шампунь", "400 мл", ["oily"], []],
  "HC-01": ["Кондиционер", "250 мл", ["dry", "damaged"], []],
  "HC-02": ["Кондиционер", "250 мл", ["oily", "normal"], []],
  "HC-03": ["Кондиционер", "200 мл", ["colored", "damaged"], []],
  "HR-02": ["Маска для волос", "200 мл", ["dry", "damaged"], []],
  "HK-01": ["Маска для волос", "150 мл", ["damaged", "dry"], []],
  "HK-02": ["Маска для волос", "200 мл", ["oily"], []],
  "HK-03": ["Маска для волос", "200 мл", ["colored"], []],
  "HR-03": ["Сыворотка для волос", "50 мл", ["dry", "damaged"], []],
  "HR-04": ["Масло для волос", "100 мл", ["normal", "dry"], []],
  // Макияж, парфюм
  "MK-01": ["Помада", "4 г", [], []],
  "MK-02": ["Тушь", "10 мл", [], []],
  "MK-03": ["Палетка теней", "12 цветов", [], []],
  "PF-01": ["Парфюмерная вода", "50 мл", [], []],
  "PF-02": ["Туалетная вода", "50 мл", [], []],
  "PF-03": ["Набор миниатюр", "3 × 10 мл", [], []],
  // Остальное
  "GG-01": ["Прокладки", "40 шт", [], []],
  "GG-02": ["Гель для интимной гигиены", "200 мл", [], []],
  "GG-03": ["Тампоны", "16 шт", [], []],
  "UW-01": ["Комплект белья", "", [], []],
  "UW-02": ["Трусики", "3 шт", [], []],
  "UW-03": ["Бюстгальтер", "", [], []],
  "SO-01": ["Жидкое мыло", "500 мл", [], []],
  "SO-02": ["Гель для душа", "400 мл", [], []],
  "SO-03": ["Мыло", "100 г", [], []],
  "HM-01": ["Свеча", "", [], []],
  "HM-02": ["Диффузор", "100 мл", [], []],
  "HM-03": ["Спрей для текстиля", "250 мл", [], []],
  "KD-01": ["Детский шампунь", "250 мл", [], []],
  "KD-02": ["Детский крем", "100 мл", [], []],
  "KD-03": ["Детская зубная паста", "50 мл", [], []],
  "AC-01": ["Расчёска", "", [], []],
  "AC-02": ["Резинки для волос", "10 шт", [], []],
  "AC-03": ["Косметичка", "", [], []],
  "MR-01": ["Шоппер", "", [], []],
  "MR-02": ["Худи", "", [], []],
  "MR-03": ["Кружка", "350 мл", [], []],
  "GF-01": ["Подарочный набор", "3 шт", [], []],
  "GF-02": ["Подарочный набор", "3 шт", [], []],
  "GF-03": ["Сертификат", "", [], []],
};

let sql = `-- Характеристики товаров для фильтров (тип продукта, объём, тип волос, тип кожи).
-- Безопасная миграция: только ДОБАВЛЯЕТ колонку и заполняет её. Товары, фото, цены, названия
-- и артикулы не удаляются и не меняются. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor.
alter table products add column if not exists attributes jsonb not null default '{}'::jsonb;

`;
for (const [sku, [productType, volume, hairType, skinType]] of Object.entries(DATA)) {
  const attrs = { productType };
  if (volume) attrs.volume = volume;
  if (hairType.length) attrs.hairType = hairType;
  if (skinType.length) attrs.skinType = skinType;
  sql += `update products set attributes = '${JSON.stringify(attrs).replace(/'/g, "''")}'::jsonb where sku = 'DEMO-${sku}';\n`;
}
writeFileSync("supabase/product_attributes.sql", sql);
console.log("attribute rows:", Object.keys(DATA).length);
