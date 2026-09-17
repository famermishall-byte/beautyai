"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import type { Branch, Product } from "@/types";

const BRANCH_STORAGE_KEY = "beautyai-branch";

const CATEGORIES = [
  "Уход за лицом",
  "Очищение",
  "Тоники",
  "Сыворотки",
  "Кремы",
  "SPF",
  "Маски",
  "Уход за глазами",
  "Макияж",
  "Уход за волосами",
];

const BUDGETS = [
  { label: "до 1 000 сом", value: 1000 },
  { label: "до 2 000 сом", value: 2000 },
  { label: "до 3 000 сом", value: 3000 },
  { label: "до 5 000 сом", value: 5000 },
  { label: "любой бюджет", value: null },
];

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);

  // Preselect "любой бюджет" when arriving via the "По бюджету" home-screen
  // shortcut. Adjusting state during render (guarded by a "did the source
  // value change?" check) is the React-recommended replacement for a
  // useEffect here — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab === "budget") setBudget(null);
  }

  useEffect(() => {
    if (initialTab === "search") {
      searchInputRef.current?.focus();
    }
  }, [initialTab]);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => {
        const list = data.branches ?? [];
        setBranches(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        } catch {
          // недоступно — просто не запомним выбор
        }
        const valid = stored && list.some((b) => b.id === stored) ? stored : null;
        setBranchId(valid ?? (list.length === 1 ? list[0].id : null));
      })
      .catch(() => setBranches([]));
  }, []);

  function handleSelectBranch(id: string) {
    setBranchId(id);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, id);
    } catch {
      // недоступно — выбор просто не сохранится между визитами
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (typeof budget === "number") params.set("maxPrice", String(budget));
    if (branchId) params.set("branchId", branchId);

    // Data fetching triggered by filter changes — this mirrors React's own
    // documented fetch-in-effect pattern (setting a loading flag synchronously
    // before the async request starts, per
    // https://react.dev/learn/you-might-not-need-an-effect#fetching-data).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/products?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query, category, budget, branchId]);

  return (
    <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-6">Каталог</h1>

      {branches.length > 1 && (
        <div className="mb-4">
          <div className="text-sm text-muted mb-2">📍 Филиал</div>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBranch(b.id)}
                className={[
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  branchId === b.id ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
                ].join(" ")}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={searchInputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию, бренду, категории"
        className="w-full rounded-full border border-black/10 bg-card px-5 py-3 outline-none transition focus:ring-2 focus:ring-accent mb-4"
      />

      <div className="mb-4">
        <div className="text-sm text-muted mb-2">Категория</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={[
              "rounded-full px-3.5 py-2 text-sm font-medium transition",
              category === null ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
            ].join(" ")}
          >
            Все
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className={[
                "rounded-full px-3.5 py-2 text-sm font-medium transition",
                category === c ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-muted mb-2">Бюджет</div>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.label}
              onClick={() => setBudget(budget === b.value ? undefined : b.value)}
              className={[
                "rounded-full px-3.5 py-2 text-sm font-medium transition",
                budget === b.value ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
              ].join(" ")}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted animate-pulse">Загружаем…</p>
      ) : products.length === 0 ? (
        <p className="text-muted">Ничего не нашлось. Попробуйте другой запрос или фильтр.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogContent />
    </Suspense>
  );
}
