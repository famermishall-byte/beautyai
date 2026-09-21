"use client";

import { AdminPage } from "@/components/admin/AdminPage";
import { OrderManager } from "@/components/OrderManager";
import { useSession } from "@/lib/session-context";

// Owner / admin see the orders of ALL branches; a branch manager sees only their own branch (the server enforces it —
// this page just says so honestly).
export default function AdminOrdersPage() {
  const { session } = useSession();
  const branchManager = session?.role === "branch_manager";

  return (
    <AdminPage
      title={branchManager ? "Заказы филиала" : "Заказы"}
      subtitle={
        branchManager
          ? "Здесь только заказы вашего филиала. Отмечайте оплату и убирайте то, чего нет в наличии."
          : "Заказы покупателей по всем филиалам. Выберите филиал, чтобы смотреть только его заказы и продажи."
      }
    >
      <OrderManager />
    </AdminPage>
  );
}
