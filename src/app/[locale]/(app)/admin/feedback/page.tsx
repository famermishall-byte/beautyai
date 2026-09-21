import { AdminPage } from "@/components/admin/AdminPage";
import { FeedbackManager } from "@/components/FeedbackManager";

export default function AdminFeedbackPage() {
  return (
    <AdminPage title="Обратная связь">
      <FeedbackManager />
    </AdminPage>
  );
}
