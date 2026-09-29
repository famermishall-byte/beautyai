/**
 * Телефон для связи в «Обратной связи» (просьба владельца 29.09: филиал должен видеть, как связаться
 * с клиентом). Сохраняем как ввёл клиент, но только если это похоже на номер: цифры, пробелы, + - ( ),
 * от 9 до 15 цифр. null — номер не годится.
 */
export function normalizeContactPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const phone = raw.trim().replace(/\s+/g, " ");
  if (!/^[+\d\s()-]+$/.test(phone)) return null;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 9 && digits <= 15 ? phone : null;
}
