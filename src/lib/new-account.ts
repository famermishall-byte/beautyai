// «Новый аккаунт» для первых вопросов про уведомления и геолокацию (FirstRunFlow.tsx).
// Раньше признаком было «регистрация только что прошла в этом же браузере» (session-flags.ts). С включённым подтверждением
// почты это не работает: письмо открывают в другом браузере/приложении, и признак теряется, а вопросы пропадают
// (жалоба владельца 07.10). Теперь смотрим на сам аккаунт: создан недавно — спрашиваем на каждом устройстве один раз
// (ответ запоминается на устройстве, permissions.ts). Старых клиентов это не касается.

export const NEW_ACCOUNT_MS = 48 * 60 * 60 * 1000;

/** Создан ли аккаунт не раньше, чем maxAgeMs назад. Нет даты или она «из будущего» дальше суток — не считаем новым. */
export function isNewAccount(createdAt: string | null | undefined, now: number = Date.now(), maxAgeMs: number = NEW_ACCOUNT_MS): boolean {
  const created = Date.parse(createdAt ?? "");
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  return age >= -24 * 60 * 60 * 1000 && age < maxAgeMs;
}
