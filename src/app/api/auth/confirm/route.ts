import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { confirmTarget, parseConfirmType, parseTokenHash } from "@/lib/auth-confirm";

/**
 * Ссылка из письма: «Подтвердить почту» (type=email) и «Сбросить пароль» (type=recovery). Проверяет ссылку и входит
 * в аккаунт в том браузере, где ссылку открыли (на iPhone это часто встроенный браузер почты, а не Safari, где человек
 * регистрировался). Дальше: подтверждение — на `/login` (вошедшего прокси сам отправит на главную, а при неудаче
 * страница входа покажет подсказку), восстановление — на `/reset-password`, где человек задаёт новый пароль; при
 * неудаче та же страница скажет, что ссылка устарела.
 */
export async function GET(request: NextRequest) {
  const tokenHash = parseTokenHash(request.nextUrl.searchParams.get("token_hash"));
  const type = parseConfirmType(request.nextUrl.searchParams.get("type"));
  const target = new URL(type ? confirmTarget(type) : "/login", request.nextUrl.origin);

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(target);
  }

  // На странице нового пароля неудача видна и без метки: там нет сессии — «ссылка недействительна».
  if (target.pathname === "/login") target.searchParams.set("confirm", "failed");
  return NextResponse.redirect(target);
}
