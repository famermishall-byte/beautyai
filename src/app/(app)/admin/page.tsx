"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BranchManager } from "@/components/BranchManager";
import type { Product } from "@/types";

type CatalogResponse = {
  storeName?: string;
  count: number;
  products: Product[];
};

export default function AdminPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  const [storeName, setStoreName] = useState("");
  const [savingStoreName, setSavingStoreName] = useState(false);
  const [storeNameSaved, setStoreNameSaved] = useState(false);

  async function loadCatalog() {
    const res = await fetch("/api/admin/catalog");
    const data: CatalogResponse = await res.json();
    setCatalog(data);
    setStoreName(data.storeName ?? "");
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  async function handleSaveStoreName(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setSavingStoreName(true);
    setStoreNameSaved(false);
    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: storeName.trim() }),
      });
      if (res.ok) {
        setStoreNameSaved(true);
        setTimeout(() => setStoreNameSaved(false), 1500);
      }
    } finally {
      setSavingStoreName(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-12 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display text-3xl">Панель магазина</h1>
        <Link href="/admin/settings" className="text-sm text-accent underline shrink-0 mt-2">
          ⚙️ Настройки аккаунта
        </Link>
      </div>
      <p className="text-muted mb-8">Загрузите ассортимент товаров, чтобы покупатели могли их найти в каталоге.</p>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-8">
        <h2 className="font-medium mb-3">Профиль магазина</h2>
        <form onSubmit={handleSaveStoreName} className="flex gap-2">
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Название магазина"
            className="flex-1 rounded-lg border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={savingStoreName || !storeName.trim()}
            className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {storeNameSaved ? "Сохранено ✓" : savingStoreName ? "Сохраняем…" : "Сохранить"}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-8">
        <h2 className="font-medium mb-3">Товары</h2>
        <p className="text-sm text-muted mb-4">
          Загрузите Excel-файл с ассортиментом — Beauty сама определит колонки и покажет предпросмотр
          перед импортом.
        </p>
        <Link
          href="/admin/import"
          className="inline-block rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95"
        >
          Загрузить товары
        </Link>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Текущий каталог</h2>
          <span className="text-sm text-muted">Товаров: {catalog?.count ?? 0}</span>
        </div>

        {!catalog || catalog.products.length === 0 ? (
          <p className="text-muted text-sm">Каталог пока пуст — загрузите файл выше.</p>
        ) : (
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
                {catalog.products.map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.brand}</td>
                    <td className="py-2 pr-4">{p.category}</td>
                    <td className="py-2 pr-4">{p.price.toLocaleString("ru-RU")} сом</td>
                    <td className="py-2 pr-4">{p.inStock ? "✅" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BranchManager />
    </main>
  );
}
