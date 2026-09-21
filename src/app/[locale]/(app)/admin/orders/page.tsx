"use client";

import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import { OrderManager } from "@/components/OrderManager";
import { useSession } from "@/lib/session-context";

// Owner / admin see the orders of ALL branches; a branch manager sees only their own branch (the server enforces it —
// this page just says so honestly).
export default function AdminOrdersPage() {
  const t = useTranslations("adminOrders");
  const { session } = useSession();
  const branchManager = session?.role === "branch_manager";

  return (
    <AdminPage
      title={branchManager ? t("titleBranch") : t("title")}
      subtitle={
        branchManager
          ? t("subtitleBranch")
          : t("subtitleAll")
      }
    >
      <OrderManager />
    </AdminPage>
  );
}
