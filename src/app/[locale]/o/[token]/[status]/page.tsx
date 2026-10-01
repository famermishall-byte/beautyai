import { redirect } from "next/navigation";

// Одноразовые ссылки первой версии (/o/<token>/<статус>) меняли статус просто при открытии — без проверки шагов.
// Теперь они ведут на страницу продавца с кнопками (/o/<token>); статус меняется только там (supabase/security_hardening.sql).
export default async function OrderStatusLinkPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  redirect(`/${locale}/o/${encodeURIComponent(token)}`);
}
