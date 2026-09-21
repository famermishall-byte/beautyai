import { AdminPage } from "@/components/admin/AdminPage";
import { BranchManager } from "@/components/BranchManager";

export default function AdminBranchesPage() {
  return (
    <AdminPage title="Филиалы">
      <BranchManager />
    </AdminPage>
  );
}
