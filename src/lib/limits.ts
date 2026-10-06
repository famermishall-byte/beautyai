// Ограничения на то, что человек может отправить на сервер (аудит 06.10, проблема №4): длина текста и частота
// заказов/сообщений. Нужны, чтобы один аккаунт не мог забить базу огромными текстами или «закрыть» склад
// потоком заказов (каждый заказ сразу резервирует остаток). Все числа — здесь, в одном месте.

export const LIMITS = {
  customerName: 100,
  customerPhone: 30,
  feedbackMessage: 2000,
  reviewComment: 1000,
  displayName: 80,
  /** Штук одного товара в корзине. Оптовый порог набирается суммой заказа, так что этого с большим запасом. */
  maxQuantity: 9999,
  /** Заказов от одного человека за последний час. */
  ordersPerHour: 5,
  /** Заказов от одного человека, которые продавец ещё не довёл до конца (OPEN_ORDER_STATUSES). */
  openOrders: 10,
  feedbackPerHour: 5,
} as const;

/** Значение из тела запроса как обрезанная строка; не строка → пустая. */
export function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Текст ошибки, если строка длиннее допустимого (длину считаем в символах, а не в «кодовых единицах» эмодзи). */
export function textLimitError(label: string, value: string, max: number): string | null {
  return [...value].length > max ? `${label} — не длиннее ${max} символов.` : null;
}

/** Можно ли оформить ещё один заказ: `lastHour` — оформлено за час, `open` — не доведено до конца. */
export function orderRateError(counts: { lastHour: number; open: number }): string | null {
  if (counts.lastHour >= LIMITS.ordersPerHour) return "Слишком много заказов за короткое время. Попробуйте через час.";
  if (counts.open >= LIMITS.openOrders) return "У вас уже много неоформленных заказов. Дождитесь, пока продавец их обработает.";
  return null;
}

export function feedbackRateError(lastHour: number): string | null {
  return lastHour >= LIMITS.feedbackPerHour ? "Слишком много сообщений за короткое время. Попробуйте позже." : null;
}

/** Количество в корзине: целое от 1 до maxQuantity. */
export function quantityError(quantity: number): string | null {
  if (!Number.isInteger(quantity) || quantity < 1) return "Неверное количество.";
  return quantity > LIMITS.maxQuantity ? `Не больше ${LIMITS.maxQuantity} шт. одного товара.` : null;
}
