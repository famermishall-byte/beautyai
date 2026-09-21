import { AdminPage } from "@/components/admin/AdminPage";
import { SourceManager } from "@/components/SourceManager";
import { Link } from "@/i18n/navigation";

export default function AdminProductsPage() {
  return (
    <AdminPage title="Товары и загрузка" subtitle="Загрузка каталога и остатков из Excel или из вашей программы.">
      <SourceManager />

      <div className="bg-card rounded-2xl border border-black/5 p-6">
        <h2 className="font-medium mb-3">Разовая загрузка каталога</h2>
        <p className="text-sm text-muted mb-4">
          Для постоянного обновления остатков по филиалам используйте раздел «Источник товаров и остатков» выше. Этот мастер — для быстрой
          разовой загрузки Excel-файла без остатков по филиалам.
        </p>
        <Link
          href="/admin/import"
          className="inline-block rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95"
        >
          Загрузить товары
        </Link>
      </div>
    </AdminPage>
  );
}
