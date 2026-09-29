/**
 * Куда вернуть человека после входа (параметр ?next=, его ставит proxy.ts). Только путь внутри сайта —
 * иначе ссылкой вида /login?next=https://… можно было бы увести на чужой сайт после ввода пароля.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return "/";
  return next;
}
