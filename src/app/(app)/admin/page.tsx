"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BranchManager } from "@/components/BranchManager";
import { OrderManager } from "@/components/OrderManager";
import { FeedbackManager } from "@/components/FeedbackManager";
import { SourceManager } from "@/components/SourceManager";
import type { Product } from "@/types";

type CatalogResponse = {
  storeName?: string;
  count: number;
  products: Product[];
};

// Blocks are ordered by how often an owner needs them: stock and orders first, setup last.
export default function AdminPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  const [storeName, setStoreName] = useState("");
  const [savingStoreName, setSavingStoreName] = useState(false);
  const [storeNameSaved, setStoreNameSaved] = useState(false);
  const [storeNameError, setStoreNameError] = useState("");

  async function loadCatalog() {
    const res = await fetch("/api/admin/catalog");
    const data: CatalogResponse = await res.json();
    setCatalog(data);
    setStoreName(data.storeName ?? "");
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCatalog();
  }, []);

  async function handleSaveStoreName(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setSavingStoreName(true);
    setStoreNameSaved(false);
    setStoreNameError("");
    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: storeName.trim() }),
      });
      if (res.ok) {
        setStoreNameSaved(true);
        setTimeout(() => setStoreNameSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setStoreNameError(data.error ?? "Не удалось сохранить название.");
      }
    } catch {
      setStoreNameError("Нет связи с сервером. Название не сохранено.");
    } finally {
      setSavingStoreName(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display text-3xl">Панель магазина</h1>
        <Link href="/admin/settings" className="text-sm text-accent underline shrink-0 mt-2">
          ⚙️ Настройки аккаунта
        </Link>
      </div>
      <p className="text-muted mb-8">Остатки, заказы и филиалы вашего магазина.</p>

      {/* 1. Остатки — чаще всего нужны */}
      <Link
        href="/admin/stock"
        className="flex items-center justify-between gap-4 bg-accent-soft rounded-2xl p-5 mb-8 transition hover:brightness-[0.98] active:scale-[0.99]"
      >
        <div>
          <div className="font-display text-lg">Остатки по филиалам</div>
          <div className="text-sm text-accent-strong/80">Что есть в каждом филиале, что заканчивается — можно править прямо здесь</div>
        </div>
        <span className="text-accent text-xl" aria-hidden>→</span>
      </Link>

      {/* 2. Заказы */}
      <div className="mb-8">
        <OrderManager />
      </div>

      {/* 3. Филиалы */}
      <div className="mb-8">
        <BranchManager />
      </div>

      {/* 4. Загрузка товаров и остатков */}
      <SourceManager />

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-8">
        <h2 className="font-medium mb-3">Разовая загрузка каталога</h2>
        <p className="text-sm text-muted mb-4">
          Для постоянного обновления остатков по филиалам используйте раздел «Источник товаров и остатков» выше.
          Этот мастер — для быстрой разовой загрузки Excel-файла без остатков по филиалам.
        </p>
        <Link
          href="/admin/import"
          className="inline-block rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95"
        >
          Загрузить товары
        </Link>
      </div>

      {/* 5. Обратная связь */}
      <div className="mb-8">
        <FeedbackManager />
      </div>

      {/* 6. Каталог — справочная таблица, свёрнута: при сотнях товаров она только мешает */}
      <details className="bg-card rounded-2xl border border-black/5 p-6 mb-8 group">
        <summary className="flex items-center justify-between cursor-pointer list-none">
          <h2 className="font-medium">Текущий каталог</h2>
          <span className="text-sm text-muted">Товаров: {catalog?.count ?? 0} · развернуть</span>
        </summary>

        {!catalog || catalog.products.length === 0 ? (
          <p className="text-muted text-sm mt-4">Каталог пока пуст — загрузите файл выше.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
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
            <p className="text-xs text-muted mt-3">«Наличие» здесь — общий признак «есть хотя бы в одном филиале». Остатки по филиалам смотрите в разделе «Остатки по филиалам».</p>
          </div>
        )}
      </details>

      {/* 7. Профиль магазина — меняется редко */}
      <div className="bg-card rounded-2xl border border-black/5 p-6">
        <h2 className="font-medium mb-3">Профиль магазина</h2>
        <form onSubmit={handleSaveStoreName} className="flex flex-wrap items-center gap-2">
          <input
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              setStoreNameSaved(false);
            }}
            placeholder="Название магазина"
            className="flex-1 min-w-[12rem] rounded-lg border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={savingStoreName || !storeName.trim()}
            className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {savingStoreName ? "Сохраняем…" : "Сохранить"}
          </button>
          <span aria-live="polite" className="text-sm">
            {storeNameSaved && <span className="text-success font-medium">✓ Название сохранено</span>}
            {storeNameError && <span className="text-error font-medium">{storeNameError}</span>}
          </span>
        </form>
      </div>
    </main>
  );
}
