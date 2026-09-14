import type { FieldKey } from "./types";

/**
 * Every field Beauty can import, with the header names/keywords different
 * stores' files tend to use for it. Auto-detection (autoMap.ts) matches a
 * file's actual headers against these aliases — to support a new synonym
 * (a new accounting program's wording), add a string here, nothing else
 * needs to change.
 */
export const IMPORT_FIELDS: {
  key: FieldKey;
  label: string;
  required: boolean;
  aliases: string[];
}[] = [
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
    aliases: ["артикул", "код", "код товара", "sku", "штрихкод", "barcode"],
  },
  {
    key: "inStock",
    label: "Остаток",
    required: false,
    aliases: ["остаток", "количество", "кол-во", "к-во", "на складе", "наличие", "stock", "qty", "quantity", "in stock"],
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
