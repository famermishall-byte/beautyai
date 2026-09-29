import { supabase } from "@/lib/supabase";
import { getOrderStatusLabel } from "@/lib/orderStatus";
import { SellerExitLinks } from "@/components/SellerExitLinks";
import { getTranslations } from "next-intl/server";

const LINK_STATUSES = new Set(["confirmed", "paid", "shipped", "completed", "cancelled"]);
const LEGACY_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

function Result({ title, text }: { title: string; text: string }) {
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

export default async function OrderStatusLinkPage({
  params,
}: {
  params: Promise<{ token: string; status: string }>;
}) {
  const { token, status } = await params;
  const t = await getTranslations("orderLink");
  const ts = await getTranslations("orderStatus");

  if (!LINK_STATUSES.has(status)) {
    return <Result title={t("badLink")} text={t("badStatus")} />;
  }

  // set_order_status_by_token (supabase/order_payments.sql) knows every status; until it is installed the
  // older function still handles the three original ones.
  let order: { number: string; status: string } | undefined;
  let error: unknown = null;
  const next = await supabase.rpc("set_order_status_by_token", { p_token: token, p_status: status });
  if (!next.error) {
    const row = next.data?.[0];
    order = row ? { number: row.order_number, status: row.order_status } : undefined;
  } else if (LEGACY_STATUSES.has(status)) {
    const legacy = await supabase.rpc("update_order_status_by_token", { p_token: token, p_status: status });
    error = legacy.error;
    order = legacy.data?.[0];
  } else {
    error = next.error;
  }

  if (error || !order) {
    return (
      <Result
        title={t("linkFailed")}
        text={t("orderNotFound")}
      />
    );
  }

  return (
    <Result
      title={t("orderTitle", { number: order.number })}
      text={t("statusUpdated", { status: getOrderStatusLabel(ts, order.status) })}
    />
  );
}
