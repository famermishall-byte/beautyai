// Копия данных магазина «одним файлом»: что входит, как листаем таблицы и как называем файл.
// Сам файл собирает `GET /api/admin/backup` (только владелец, сервисным ключом).

/** Размер одной «страницы» при чтении таблицы: у Supabase ответ без этого обрезается на 1000 строк. */
export const BACKUP_PAGE = 1000;

/**
 * Таблицы в копии. `orderBy` — столбцы, по которым листаем (первичный ключ), чтобы страницы не пересекались.
 * Порядок — тот, в котором таблицы можно заливать обратно (родители раньше детей).
 * НЕ входит `push_subscriptions`: это ключи устройств, они нужны только для уведомлений и пересоздаются, когда
 * человек снова включает уведомления.
 */
export const BACKUP_TABLES: { name: string; orderBy: string[] }[] = [
  { name: "stores", orderBy: ["id"] },
  { name: "profiles", orderBy: ["id"] },
  { name: "branches", orderBy: ["id"] },
  { name: "products", orderBy: ["id"] },
  { name: "product_branch_stock", orderBy: ["id"] },
  { name: "new_arrivals", orderBy: ["id"] },
  { name: "promotions", orderBy: ["id"] },
  { name: "banners", orderBy: ["id"] },
  { name: "home_slides", orderBy: ["id"] },
  { name: "store_order_counters", orderBy: ["store_id"] },
  { name: "orders", orderBy: ["id"] },
  { name: "cart_items", orderBy: ["user_id", "product_id"] },
  { name: "saved_products", orderBy: ["id"] },
  { name: "product_reviews", orderBy: ["id"] },
  { name: "feedback", orderBy: ["id"] },
  { name: "push_broadcasts", orderBy: ["id"] },
  { name: "import_templates", orderBy: ["id"] },
  { name: "import_review_items", orderBy: ["id"] },
];

/** Имя файла: `beauty-backup-2026-10-03.json` (дата по Бишкеку, UTC+6). */
export function backupFileName(now: Date): string {
  const bishkek = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return `beauty-backup-${bishkek.toISOString().slice(0, 10)}.json`;
}

/** Читает таблицу страницами, пока страница не окажется неполной. `fetchPage(from, to)` — как `.range(from, to)`. */
export async function fetchAllRows<T>(fetchPage: (from: number, to: number) => Promise<T[]>, pageSize = BACKUP_PAGE): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
