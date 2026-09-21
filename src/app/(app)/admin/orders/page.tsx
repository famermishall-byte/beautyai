import { AdminPage } from "@/components/admin/AdminPage";
import { OrderManager } from "@/components/OrderManager";

export default function AdminOrdersPage() {
  return (
    <AdminPage title="Заказы" subtitle="Заказы покупателей по всем филиалам. Меняйте статус, когда заказ подтверждён или выдан.">
      <OrderManager />
    </AdminPage>
  );
}
