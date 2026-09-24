import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import { SourceManager } from "@/components/SourceManager";
import { Link } from "@/i18n/navigation";

import { buttonClasses } from "@/components/ui/Button";
export default function AdminProductsPage() {
  const t = useTranslations("adminProducts");
  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <SourceManager />

      <div className="surface-card p-6">
        <h2 className="font-medium mb-3">{t("oneOffTitle")}</h2>
        <p className="text-sm text-muted mb-4">
          {t("oneOffText")}
        </p>
        <Link
          href="/admin/import"
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {t("uploadButton")}
        </Link>
      </div>
    </AdminPage>
  );
}
