import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import { SourceManager } from "@/components/SourceManager";
import { Link } from "@/i18n/navigation";

export default function AdminProductsPage() {
  const t = useTranslations("adminProducts");
  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <SourceManager />

      <div className="bg-card rounded-2xl border border-black/5 p-6">
        <h2 className="font-medium mb-3">{t("oneOffTitle")}</h2>
        <p className="text-sm text-muted mb-4">
          {t("oneOffText")}
        </p>
        <Link
          href="/admin/import"
          className="inline-block rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95"
        >
          {t("uploadButton")}
        </Link>
      </div>
    </AdminPage>
  );
}
