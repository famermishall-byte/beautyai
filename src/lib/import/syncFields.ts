import type { FieldKey } from "./types";

/**
 * Field list for the stock-sync pipeline (src/lib/import/sync.ts + the
 * "Источники" admin UI) — a separate list from IMPORT_FIELDS (fields.ts) so
 * the original one-off catalog-upload wizard's auto-mapping never changes.
 * Swaps the old boolean `inStock` for a numeric `quantity` (written per
 * branch) and adds the matching keys a real sync needs: `barcode`,
 * `externalId`, and an optional per-row `branchName` for files that already
 * separate rows by branch/warehouse.
 */
export const SYNC_IMPORT_FIELDS: { key: FieldKey; label: string; required: boolean; aliases: string[] }[] = [
  {
    key: "name",
    label: "Название",
    required: true,
    aliases: ["название", "наименование", "товар", "имя товара", "name", "product", "title"],
  },
  {
    key: "price",
    label: "Цена",
    required: true,
    aliases: ["цена", "розничная цена", "стоимость", "price", "cost"],
  },
  {
    key: "sku",
    label: "Артикул",
    required: false,
    aliases: ["артикул", "код", "код товара", "sku", "article", "vendor code"],
  },
  {
    key: "barcode",
    label: "Штрихкод",
    required: false,
    aliases: ["штрихкод", "штрих-код", "barcode", "ean", "upc"],
  },
  {
    key: "externalId",
    label: "ID во внешней системе",
    required: false,
    aliases: ["id", "id товара", "external id", "external_id", "uuid", "guid"],
  },
  {
    key: "quantity",
    label: "Остаток (количество)",
    required: false,
    aliases: [
      "остаток",
      "остатки",
      "количество",
      "кол-во",
      "к-во",
      "на складе",
      "stock",
      "qty",
      "quantity",
      "balance",
    ],
  },
  {
    key: "branchName",
    label: "Филиал / склад",
    required: false,
    aliases: ["филиал", "склад", "магазин", "точка продаж", "branch", "warehouse", "store"],
  },
  {
    key: "brand",
    label: "Бренд",
    required: false,
    aliases: ["бренд", "производитель", "brand", "manufacturer"],
  },
  {
    key: "category",
    label: "Категория",
    required: false,
    aliases: ["категория", "раздел", "группа", "category"],
  },
  {
    key: "description",
    label: "Описание",
    required: false,
    aliases: ["описание", "description"],
  },
  {
    key: "characteristics",
    label: "Характеристики",
    required: false,
    aliases: ["характеристики", "свойства", "characteristics"],
  },
  {
    key: "purpose",
    label: "Для кого/чего",
    required: false,
    aliases: ["для кого/чего", "для кого", "назначение", "purpose"],
  },
  {
    key: "imageUrl",
    label: "Фото",
    required: false,
    aliases: ["фото", "изображение", "image", "photo", "фото (ссылка)"],
  },
];
