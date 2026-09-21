import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrderStatusLabel } from "@/lib/orderStatus";

const LINK_STATUSES = new Set(["confirmed", "paid", "shipped", "completed", "cancelled"]);
const LEGACY_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

function Result({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Link
        href="/"
        aria-label="Назад"
        className="fixed top-3 left-3 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center transition hover:bg-black/5 active:scale-90"
      >
        <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
      </Link>
      <h1 className="font-display text-2xl mb-3">{title}</h1>
      <p className="text-muted max-w-sm">{text}</p>
    </main>
  );
}

export default async function OrderStatusLinkPage({
  params,
}: {
  params: Promise<{ token: string; status: string }>;
}) {
  const { token, status } = await params;

  if (!LINK_STATUSES.has(status)) {
    return <Result title="Некорректная ссылка" text="Такой статус нельзя установить по ссылке." />;
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
        title="Ссылка не сработала"
        text="Заказ не найден — возможно, ссылка устарела или введена неверно."
      />
    );
  }

  return (
    <Result
      title={`Заказ #${order.number}`}
      text={`Статус обновлён: «${getOrderStatusLabel(order.status)}» ✅`}
    />
  );
}
