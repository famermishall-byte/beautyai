import { supabase } from "@/lib/supabase";
import { OrderConsole, type ConsoleOrder } from "@/components/OrderConsole";
import { SellerExitLinks } from "@/components/SellerExitLinks";
import { getTranslations } from "next-intl/server";

// The seller's one-link console. Always read fresh (the order can change at any moment).
export const dynamic = "force-dynamic";

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl mb-3">{title}</h1>
      <p className="text-muted max-w-sm mb-8">{text}</p>
      <div className="w-full max-w-sm">
        <SellerExitLinks customerPhone={null} />
      </div>
    </main>
  );
}

export default async function OrderConsolePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("orderLink");
  const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });

  if (error) {
    return <Message title={t("notConnected")} text={t("notConnectedHint")} />;
  }
  if (!data) {
    return <Message title={t("notFound")} text={t("notFoundHint")} />;
  }

  return <OrderConsole token={token} initial={data as ConsoleOrder} />;
}
