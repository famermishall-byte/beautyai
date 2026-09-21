import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import { FeedbackManager } from "@/components/FeedbackManager";

export default function AdminFeedbackPage() {
  const t = useTranslations("feedbackAdmin");
  return (
    <AdminPage title={t("title")}>
      <FeedbackManager />
    </AdminPage>
  );
}
