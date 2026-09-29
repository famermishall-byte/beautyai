import { getTranslations } from "next-intl/server";
import { supabase } from "@/lib/supabase";
import { CourierConsole, type CourierOrder } from "@/components/CourierConsole";

// Страница курьера по ссылке из WhatsApp — без входа. Всегда свежие данные (продавец мог изменить заказ).
export const dynamic = "force-dynamic";

export default async function CourierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("courier");
  const { data } = await supabase.rpc("get_order_by_courier_token", { p_token: token });

  if (!data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl mb-3">{t("notFound")}</h1>
        <p className="text-muted max-w-sm">{t("notFoundHint")}</p>
      </main>
    );
  }

  return <CourierConsole token={token} initial={data as CourierOrder} />;
}
