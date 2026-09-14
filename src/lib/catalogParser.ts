import * as XLSX from "xlsx";

export type ParsedProduct = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string;
  characteristics: string;
  purpose: string;
  inStock: boolean;
  imageUrl: string;
};

export type ParseResult = {
  products: ParsedProduct[];
  errors: string[];
};

// Ожидаемые столбцы (порядок неважен, регистр неважен):
// Название | Бренд | Категория | Цена | Описание | Характеристики | Для кого/чего | Наличие | Артикул | Фото
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["название", "наименование", "name"],
  brand: ["бренд", "brand"],
  category: ["категория", "category"],
  price: ["цена", "price"],
  description: ["описание", "description"],
  characteristics: ["характеристики", "characteristics"],
  purpose: ["для кого/чего", "для кого", "назначение", "purpose"],
  inStock: ["наличие", "in stock", "instock"],
  sku: ["артикул", "sku", "код товара"],
  imageUrl: ["фото", "изображение", "image", "photo", "фото (ссылка)"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalized)) {
        map[field] = index;
      }
    }
  });
  return map;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true; // если не указано — считаем, что товар в наличии
  return !["нет", "0", "false", "нет в наличии", "закончился", "no"].includes(text);
}

function parsePrice(value: unknown): number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function parseCatalogFile(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const errors: string[] = [];
  if (rows.length < 2) {
    return { products: [], errors: ["Файл пустой или не содержит строк с товарами."] };
  }

  const headerRow = rows[0].map((cell) => String(cell));
  const headerMap = buildHeaderMap(headerRow);

  const requiredFields = ["name", "brand", "category", "price"];
  const missingRequired = requiredFields.filter((field) => !(field in headerMap));
  if (missingRequired.length > 0) {
    errors.push(
      `В файле не найдены обязательные столбцы: ${missingRequired.join(", ")}. Проверь заголовки таблицы.`
    );
    return { products: [], errors };
  }

  const products: ParsedProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell ?? "").trim() === "")) continue;

    const get = (field: string): string =>
      field in headerMap ? String(row[headerMap[field]] ?? "").trim() : "";

    const name = get("name");
    const brand = get("brand");
    const category = get("category");
    const priceRaw = get("price");
    const price = parsePrice(priceRaw);

    if (!name) {
      errors.push(`Строка ${i + 1}: пропущено название товара — строка пропущена.`);
      continue;
    }
    if (Number.isNaN(price)) {
      errors.push(`Строка ${i + 1} ("${name}"): некорректная цена "${priceRaw}" — строка пропущена.`);
      continue;
    }

    products.push({
      sku: get("sku") || `AUTO-${i}`,
      name,
      brand: brand || "Без бренда",
      category: category || "Без категории",
      price,
      description: get("description"),
      characteristics: get("characteristics"),
      purpose: get("purpose"),
      inStock: parseBoolean(get("inStock")),
      imageUrl: get("imageUrl"),
    });
  }

  return { products, errors };
}
