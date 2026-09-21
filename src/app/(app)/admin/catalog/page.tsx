"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import type { Product } from "@/types";

const PAGE = 100;

export default function AdminCatalogPage() {
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
    <AdminPage title="Каталог" subtitle="Все товары магазина. Остатки по филиалам смотрите и правьте в разделе «Остатки».">
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Название, бренд, категория или артикул"
          className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {products === null ? (
        <p className="text-muted text-sm">Загружаем…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm">Ничего не найдено.</p>
      ) : (
        <div className="bg-card rounded-2xl border border-black/5 p-4">
          <div className="text-sm text-muted mb-3">
            Показано {Math.min(shown, filtered.length)} из {filtered.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-black/10">
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">Бренд</th>
                  <th className="py-2 pr-4">Категория</th>
                  <th className="py-2 pr-4">Цена</th>
                  <th className="py-2 pr-4">Наличие</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.brand}</td>
                    <td className="py-2 pr-4">{p.category}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{p.price.toLocaleString("ru-RU")} сом</td>
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
              Показать ещё {Math.min(PAGE, filtered.length - shown)}
            </button>
          )}
          <p className="text-xs text-muted mt-3">«Наличие» — общий признак «есть хотя бы в одном филиале».</p>
        </div>
      )}
    </AdminPage>
  );
}
