import { supabase } from "@/lib/supabase";
import { getOrderStatusLabel } from "@/lib/orderStatus";

const LINK_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

function Result({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
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

  const { data, error } = await supabase.rpc("update_order_status_by_token", {
    p_token: token,
    p_status: status,
  });

  const order = data?.[0];

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
