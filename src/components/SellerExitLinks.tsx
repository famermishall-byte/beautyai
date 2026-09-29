import { useTranslations } from "next-intl";
import { LayoutDashboard, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { whatsappChatUrl } from "@/lib/whatsapp";

/**
 * Выход со страницы заказа, которую продавец открыл по ссылке из WhatsApp (/o/<token>): без этих кнопок
 * из встроенного браузера WhatsApp/Chrome было не вернуться (жалоба владельца 29.09).
 * «Вернуться в WhatsApp» — в чат с клиентом этого заказа (без номера — просто WhatsApp);
 * «Открыть админку» — заказы; менеджер филиала там видит только свой филиал, без входа попросит войти.
 */
export function SellerExitLinks({ customerPhone }: { customerPhone: string | null }) {
  const t = useTranslations("sellerExit");
  return (
    <div className="flex flex-col gap-2 w-full">
      <a
        href={whatsappChatUrl(customerPhone)}
        className="rounded-full bg-[#25D366] text-white py-3.5 text-base font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <MessageCircle className="size-5" strokeWidth={2} aria-hidden />
        {t("backToWhatsapp")}
      </a>
      <Link
        href="/admin/orders"
        className="rounded-full border border-border bg-card py-3.5 text-base font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LayoutDashboard className="size-5" strokeWidth={1.8} aria-hidden />
        {t("openAdmin")}
      </Link>
    </div>
  );
}
