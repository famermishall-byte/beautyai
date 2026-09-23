// camelCase, как в Banner/Promotion (src/types.ts) — effectiveState/isVisibleToCustomers принимают
// сами объекты Banner/Promotion напрямую (в BannerManager.tsx/PromotionManager.tsx), а apply-promotion.ts
// передаёт то же самое, только явно перечисленными полями. Один и тот же регистр везде, без конверсий.
type StatusRow = { status: "draft" | "active" | "disabled"; startAt: string; endAt: string };

export type EffectiveState = "draft" | "scheduled" | "active" | "expired" | "disabled";

/**
 * «Активен» в базе — не значит видим клиенту прямо сейчас: период может ещё не начаться или уже
 * закончиться. Одна функция считает реальное состояние — используется и в API (что видит клиент),
 * и в админке (какой бейдж показать), чтобы эти два места никогда не разошлись.
 */
export function effectiveState(row: StatusRow, now: Date = new Date()): EffectiveState {
  if (row.status === "disabled") return "disabled";
  if (row.status === "draft") return "draft";
  // status === "active" отсюда и ниже
  const start = new Date(row.startAt);
  const end = new Date(row.endAt);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

export function isVisibleToCustomers(row: StatusRow, now: Date = new Date()): boolean {
  return effectiveState(row, now) === "active";
}
