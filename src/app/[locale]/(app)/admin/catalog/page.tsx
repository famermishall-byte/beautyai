"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { Search } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import type { Product } from "@/types";

const PAGE = 100;

export default function AdminCatalogPage() {
  const t = useTranslations("adminCatalog");
  const price = usePrice();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    fetch("/api/admin/catalog")
      .then((res) => res.json())
      .then((data: { products?: Product[] }) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (products ?? []).filter((p) => !q || [p.name, p.brand, p.category, p.sku].some((v) => v?.toLowerCase().includes(q)));

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {products === null ? (
        <p className="text-muted text-sm">{t("loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">{t("nothingFound")}</p>
      ) : (
        <div className="bg-card rounded-card border border-border p-4">
          <div className="text-sm text-muted mb-3">
            {t("shown", { shown: Math.min(shown, filtered.length), total: filtered.length })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-4">{t("colName")}</th>
                  <th className="py-2 pr-4">{t("colBrand")}</th>
                  <th className="py-2 pr-4">{t("colCategory")}</th>
                  <th className="py-2 pr-4">{t("colVolume")}</th>
                  <th className="py-2 pr-4">{t("colBarcode")}</th>
                  <th className="py-2 pr-4">{t("colPrice")}</th>
                  <th className="py-2 pr-4">{t("colStock")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.brand}</td>
                    <td className="py-2 pr-4">{p.category}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{p.attributes?.volume ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">{p.barcode ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{price(p.price)}</td>
                    <td className="py-2 pr-4">{p.inStock ? "✅" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown < filtered.length && (
            <button
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-medium transition hover:border-accent/40"
            >
              {t("showMore", { n: Math.min(PAGE, filtered.length - shown) })}
            </button>
          )}
          <p className="text-xs text-muted mt-3">{t("stockNote")}</p>
        </div>
      )}
    </AdminPage>
  );
}
