// Ссылка подтверждения почты из письма: `/api/auth/confirm?token_hash=…&type=email`.
// Работает в любом браузере (в отличие от ссылки по умолчанию, которой нужен тот же браузер, где человек регистрировался).
export type ConfirmType = "email" | "signup";

export function parseConfirmType(value: string | null): ConfirmType | null {
  return value === "email" || value === "signup" ? value : null;
}

/** Откуда разрешено принимать токен: непустой, без пробелов и слишком длинных значений. */
export function parseTokenHash(value: string | null): string | null {
  if (!value || value.length > 200 || /\s/.test(value)) return null;
  return value;
}
