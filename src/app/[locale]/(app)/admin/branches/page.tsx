import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import { BranchManager } from "@/components/BranchManager";

export default function AdminBranchesPage() {
  const t = useTranslations("branchManager");
  return (
    <AdminPage title={t("title")}>
      <BranchManager />
    </AdminPage>
  );
}
