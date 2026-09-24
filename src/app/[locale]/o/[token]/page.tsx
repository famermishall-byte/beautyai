import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OrderConsole, type ConsoleOrder } from "@/components/OrderConsole";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

// The seller's one-link console. Always read fresh (the order can change at any moment).
export const dynamic = "force-dynamic";

function Message({ title, text, backLabel }: { title: string; text: string; backLabel: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Link
        href="/"
        aria-label={backLabel}
        className="fixed top-3 left-3 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center transition hover:bg-state-hover active:scale-90"
      >
        <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
      </Link>
      <h1 className="font-display text-2xl mb-3">{title}</h1>
      <p className="text-muted max-w-sm">{text}</p>
    </main>
  );
}

export default async function OrderConsolePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("orderLink");
  const back = (await getTranslations("common"))("back");
  const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });

  if (error) {
    return <Message title={t("notConnected")} text={t("notConnectedHint")} backLabel={back} />;
  }
  if (!data) {
    return <Message title={t("notFound")} text={t("notFoundHint")} backLabel={back} />;
  }

  return <OrderConsole token={token} initial={data as ConsoleOrder} />;
}
