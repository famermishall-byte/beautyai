/**
 * Период «Продаж», который вводят вручную: «С» и «По» в виде ДД.ММ.ГГГГ (просьба владельца 29.09 — не календарём,
 * а цифрами). Быстрые кнопки только заполняют поля. Пустое поле — без ограничения с этой стороны.
 * Даты — по местному времени телефона, оба дня включительно.
 */

export type PresetKey = "today" | "7" | "30" | "all";

/** Оставляет цифры (не больше 8) и расставляет точки: "01092026" → "01.09.2026". */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** Начало дня по ДД.ММ.ГГГГ; null — дата неполная или такой нет (31.04, 29.02 не в високосный). */
export function parseDateInput(s: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (year < 2000 || year > 2100) return null;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d : null;
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Даты для быстрой кнопки; «7 дней» и «30 дней» считают сегодняшний день. */
export function presetRange(key: PresetKey, now: Date = new Date()): { from: string; to: string } {
  if (key === "all") return { from: "", to: "" };
  const days = key === "today" ? 1 : Number(key);
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { from: toDateInput(from), to: toDateInput(now) };
}

/** Попадает ли момент в период: с начала дня `from` до конца дня `to`. */
export function inDateRange(iso: string, from: Date | null, to: Date | null): boolean {
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t >= new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime()) return false;
  return true;
}
