import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OrderConsole, type ConsoleOrder } from "@/components/OrderConsole";

// The seller's one-link console. Always read fresh (the order can change at any moment).
export const dynamic = "force-dynamic";

function Message({ title, text }: { title: string; text: string }) {
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

export default async function OrderConsolePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });

  if (error) {
    return <Message title="Страница обработки не подключена" text="Владельцу магазина нужно запустить SQL «order_edit» в Supabase. Пока можно менять заказы в приложении." />;
  }
  if (!data) {
    return <Message title="Заказ не найден" text="Возможно, ссылка устарела или введена неверно." />;
  }

  return <OrderConsole token={token} initial={data as ConsoleOrder} />;
}
