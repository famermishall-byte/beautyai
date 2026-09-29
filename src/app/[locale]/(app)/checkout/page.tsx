import { redirect } from "next/navigation";

// Заказ теперь оформляется прямо в корзине (CartDrawer); старые ссылки/закладки на /checkout
// ведут на главную, где корзина под рукой.
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
