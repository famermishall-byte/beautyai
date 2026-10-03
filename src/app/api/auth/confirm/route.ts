import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseConfirmType, parseTokenHash } from "@/lib/auth-confirm";

/**
 * Ссылка «Подтвердить почту» из письма. Подтверждает почту и сразу входит в аккаунт в том браузере, где
 * ссылку открыли (на iPhone это часто встроенный браузер почты, а не Safari, где человек регистрировался).
 * Дальше — на `/login`: вошедшего прокси сам отправит на главную, а при неудаче страница входа покажет подсказку.
 */
export async function GET(request: NextRequest) {
  const tokenHash = parseTokenHash(request.nextUrl.searchParams.get("token_hash"));
  const type = parseConfirmType(request.nextUrl.searchParams.get("type"));
  const target = new URL("/login", request.nextUrl.origin);

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(target);
  }

  target.searchParams.set("confirm", "failed");
  return NextResponse.redirect(target);
}
