"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import type { Branch, Product } from "@/types";

const BRANCH_STORAGE_KEY = "beautyai-branch";

const BUDGETS = [
  { label: "до 1 000 сом", value: 1000 },
  { label: "до 2 000 сом", value: 2000 },
  { label: "до 3 000 сом", value: 3000 },
  { label: "до 5 000 сом", value: 5000 },
];

const SORTS = [
  { label: "По названию", value: "name" },
  { label: "Сначала дешёвые", value: "price-asc" },
  { label: "Сначала дорогие", value: "price-desc" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null | undefined>(undefined);
  const [brand, setBrand] = useState<string | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    if (initialTab === "budget") setFiltersOpen(true);
  }

  // Arriving via a home-screen category tile (?group=...): a group with
  // subcategories shows them as chips (see render below); a group without
  // any (e.g. "Макияж") filters straight to every category in that group.
  const groupParam = searchParams.get("group");
  const activeGroup = CATEGORY_GROUPS.find((g) => g.name === groupParam) ?? null;
  const [prevGroupParam, setPrevGroupParam] = useState(groupParam);
  if (groupParam !== prevGroupParam) {
    setPrevGroupParam(groupParam);
    if (activeGroup) {
      setCategory(activeGroup.children.length > 0 ? activeGroup.children.join(",") : activeGroup.name);
    }
  }

  useEffect(() => {
    if (initialTab === "search") {
      searchInputRef.current?.focus();
    }
  }, [initialTab]);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
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

  // Brand/in-stock/sort apply client-side over the fetched page — the
  // catalog is small (tens of items per store), so a second network
  // round-trip for these buys nothing.
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products]);

  const visible = useMemo(() => {
    let list = products;
    if (brand) list = list.filter((p) => p.brand === brand);
    if (onlyInStock) list = list.filter((p) => p.branchQuantity === undefined || (p.branchQuantity ?? 0) > 0);
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return a.name.localeCompare(b.name, "ru");
    });
    return list;
  }, [products, brand, onlyInStock, sort]);

  const activeFilterCount = [brand, onlyInStock || null, typeof budget === "number" ? budget : null, sort !== "name" ? sort : null].filter(
    Boolean
  ).length;

  function resetFilters() {
    setBrand(null);
    setOnlyInStock(false);
    setBudget(undefined);
    setSort("name");
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-8 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-5">Каталог</h1>

      {branches.length > 1 && (
        <div className="mb-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted mb-2">
            <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
            Филиал
          </div>
          <div className="flex gap-2 w-max">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBranch(b.id)}
                className={[
                  "rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
                  branchId === b.id ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
                ].join(" ")}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название, бренд, категория"
            className="w-full rounded-[var(--radius-control)] border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          aria-label="Фильтры и сортировка"
          className="relative shrink-0 w-12 h-12 rounded-[var(--radius-control)] bg-card border border-border flex items-center justify-center transition hover:border-accent/40 active:scale-95"
        >
          <SlidersHorizontal className="size-4.5" strokeWidth={2} aria-hidden />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-2 -mx-4 px-4 overflow-x-auto">
        <div className="text-xs font-medium text-muted mb-2">{activeGroup ? activeGroup.name : "Категория"}</div>
        <div className="flex gap-2 w-max">
          {activeGroup && activeGroup.children.length > 0 ? (
            <>
              <CategoryChip
                label="Все"
                active={category === activeGroup.children.join(",")}
                onClick={() => setCategory(activeGroup.children.join(","))}
              />
              {activeGroup.children.map((c) => (
                <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
              ))}
            </>
          ) : (
            <>
              <CategoryChip label="Все" active={category === null} onClick={() => setCategory(null)} />
              {CATEGORIES.map((c) => (
                <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(category === c ? null : c)} />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="text-sm text-muted mb-4">
        {loading ? "Ищем…" : `${visible.length} ${pluralizeProducts(visible.length)}`}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Ничего не нашлось"
          description="Попробуйте изменить запрос или сбросить фильтры."
          action={
            activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((product, i) => (
            <div key={product.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Фильтры и сортировка"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={resetFilters}>
              Сбросить
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setFiltersOpen(false)}>
              Показать {visible.length}
            </Button>
          </div>
        }
      >
        <FilterSection title="Сортировка">
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <CategoryChip key={s.value} label={s.label} active={sort === s.value} onClick={() => setSort(s.value)} />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Цена, сом">
          <div className="flex flex-wrap gap-2">
            <CategoryChip label="Любая" active={budget === undefined} onClick={() => setBudget(undefined)} />
            {BUDGETS.map((b) => (
              <CategoryChip
                key={b.label}
                label={b.label}
                active={budget === b.value}
                onClick={() => setBudget(budget === b.value ? undefined : b.value)}
              />
            ))}
          </div>
        </FilterSection>

        {brands.length > 1 && (
          <FilterSection title="Бренд">
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Все бренды" active={brand === null} onClick={() => setBrand(null)} />
              {brands.map((b) => (
                <CategoryChip key={b} label={b} active={brand === b} onClick={() => setBrand(brand === b ? null : b)} />
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection title="Наличие">
          <button
            onClick={() => setOnlyInStock((v) => !v)}
            className={[
              "w-full flex items-center justify-between rounded-[var(--radius-control)] px-4 py-3.5 text-sm font-medium transition border",
              onlyInStock ? "bg-accent-soft border-accent/30 text-accent-strong" : "bg-card border-border text-foreground",
            ].join(" ")}
          >
            Только в наличии
            <span
              className={[
                "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0",
                onlyInStock ? "bg-accent justify-end" : "bg-border-strong justify-start",
              ].join(" ")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </span>
          </button>
        </FilterSection>
      </BottomSheet>
    </main>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
        active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="text-sm font-medium mb-2.5">{title}</div>
      {children}
    </div>
  );
}

function pluralizeProducts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "товара";
  return "товаров";
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogContent />
    </Suspense>
  );
}
