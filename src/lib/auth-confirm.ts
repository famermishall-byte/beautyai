// Ссылка из письма: `/api/auth/confirm?token_hash=…&type=email` (подтверждение почты) или `…&type=recovery`
// (восстановление пароля). Работает в любом браузере (в отличие от ссылки по умолчанию, которой нужен тот же браузер,
// где человек регистрировался или нажимал «Забыли пароль»).
export type ConfirmType = "email" | "signup" | "recovery";

export function parseConfirmType(value: string | null): ConfirmType | null {
  return value === "email" || value === "signup" || value === "recovery" ? value : null;
}

/** Куда вести человека после проверки ссылки: восстановление пароля — на страницу нового пароля, остальное — на вход. */
export function confirmTarget(type: ConfirmType): "/reset-password" | "/login" {
  return type === "recovery" ? "/reset-password" : "/login";
}

/** Откуда разрешено принимать токен: непустой, без пробелов и слишком длинных значений. */
export function parseTokenHash(value: string | null): string | null {
  if (!value || value.length > 200 || /\s/.test(value)) return null;
  return value;
}
