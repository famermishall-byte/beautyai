"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, MapPin, PackageSearch, ShoppingBag, Percent, Flame, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CATEGORIES, CATEGORY_GROUPS, groupCategoryFilter, type CategoryGroup } from "@/lib/categories";
import { HAIR_TYPE_LABELS, SKIN_TYPE_LABELS, hairTypesOf, skinTypesOf } from "@/lib/attributes";
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

  // Arriving via a search-screen tile (?group=...): a group with subcategories
  // shows them as chips (see render below); a group without any (e.g.
  // "Макияж") filters straight to that category.
  const groupParam = searchParams.get("group");
  const subParam = searchParams.get("sub");
  const itemParam = searchParams.get("item");
  const promo = searchParams.get("promo") === "1";
  const showAll = searchParams.get("all") === "1" || promo;
  const activeGroup = CATEGORY_GROUPS.find((g) => g.name === groupParam) ?? null;
  const activeSection = activeGroup?.sections?.find((s) => s.label === subParam) ?? null;
  const activeItem = activeSection?.items?.find((i) => i.label === itemParam) ?? null;
  const groupFilter = activeGroup ? groupCategoryFilter(activeGroup, subParam) : null;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(groupFilter);
  const [budget, setBudget] = useState<number | null | undefined>(undefined);
  const [brand, setBrand] = useState<string | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [productType, setProductType] = useState<string | null>(null);
  const [hairType, setHairType] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [volume, setVolume] = useState<string | null>(null);
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

  const groupKey = `${groupParam ?? ""}|${subParam ?? ""}|${itemParam ?? ""}`;
  const [prevGroupKey, setPrevGroupKey] = useState(groupKey);
  if (groupKey !== prevGroupKey) {
    setPrevGroupKey(groupKey);
    setCategory(groupFilter);
    setBrand(null);
    setProductType(null);
    setHairType(null);
    setSkinType(null);
    setVolume(null);
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
  // Products of the open collection: an attribute section (e.g. "Сухие волосы") narrows the
  // fetched category set by product attributes, without any duplicated rows in the database.
  const scoped = useMemo(() => {
    let list = products;
    const want = activeSection?.attr?.hairType;
    if (want) list = list.filter((p) => hairTypesOf(p).includes(want));
    const tag = activeItem?.tag;
    if (tag) list = list.filter((p) => p.attributes?.tags?.includes(tag));
    if (promo) list = list.filter((p) => (p.attributes?.oldPrice ?? 0) > p.price);
    return list;
  }, [products, activeSection, activeItem, promo]);

  const brands = useMemo(() => [...new Set(scoped.map((p) => p.brand).filter(Boolean))].sort(), [scoped]);
  const productTypes = useMemo(() => [...new Set(scoped.map((p) => p.attributes?.productType).filter(Boolean) as string[])].sort(), [scoped]);
  const volumes = useMemo(() => [...new Set(scoped.map((p) => p.attributes?.volume).filter(Boolean) as string[])].sort(), [scoped]);
  const hairTypes = useMemo(() => Object.keys(HAIR_TYPE_LABELS).filter((k) => scoped.some((p) => hairTypesOf(p).includes(k))), [scoped]);
  const skinTypes = useMemo(() => Object.keys(SKIN_TYPE_LABELS).filter((k) => scoped.some((p) => skinTypesOf(p).includes(k))), [scoped]);

  const visible = useMemo(() => {
    let list = scoped;
    if (brand) list = list.filter((p) => p.brand === brand);
    if (productType) list = list.filter((p) => p.attributes?.productType === productType);
    if (volume) list = list.filter((p) => p.attributes?.volume === volume);
    if (hairType) list = list.filter((p) => hairTypesOf(p).includes(hairType));
    if (skinType) list = list.filter((p) => skinTypesOf(p).includes(skinType));
    if (onlyInStock) list = list.filter((p) => p.branchQuantity === undefined || (p.branchQuantity ?? 0) > 0);
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return a.name.localeCompare(b.name, "ru");
    });
    return list;
  }, [scoped, brand, productType, volume, hairType, skinType, onlyInStock, sort]);

  // The search screen opens as a grid of category tiles; anything that narrows
  // the catalog (a query, a tile, "Все продукты", the budget shortcut) swaps
  // the grid for the product list.
  const browsing = !groupParam && !showAll && !query.trim() && category === null && initialTab !== "budget";
  // A group with sections (e.g. "Уход за кожей") opens its own menu of sections
  // + "Хит продаж" before the product list.
  const groupMenu = !!activeGroup?.sections && !subParam && !showAll && !query.trim();
  // A section with a third level (e.g. "Уход для лица") opens a list of its sub-sections first.
  const sectionMenu = !!activeSection?.items && !itemParam && !showAll && !query.trim();

  const activeFilterCount = [brand, productType, volume, hairType, skinType, onlyInStock || null, typeof budget === "number" ? budget : null, sort !== "name" ? sort : null].filter(
    Boolean
  ).length;

  function resetFilters() {
    setBrand(null);
    setProductType(null);
    setVolume(null);
    setHairType(null);
    setSkinType(null);
    setOnlyInStock(false);
    setBudget(undefined);
    setSort("name");
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-32 max-w-5xl mx-auto w-full">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        {!browsing && !groupMenu && !sectionMenu && (
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="Фильтры и сортировка"
            className="relative shrink-0 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center transition hover:border-accent/40 active:scale-95"
          >
            <SlidersHorizontal className="size-4.5" strokeWidth={2} aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      <h1 className="font-display text-3xl mb-4">{promo ? "Акции" : activeItem ? activeItem.label : activeSection ? activeSection.label : activeGroup && !browsing ? activeGroup.name : "Каталог"}</h1>

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

      {browsing ? (
        <CategoryTiles />
      ) : groupMenu ? (
        <GroupMenu group={activeGroup!} />
      ) : sectionMenu ? (
        <SectionMenu group={activeGroup!} section={activeSection!} />
      ) : (
        <>
      <div className="mb-2 -mx-4 px-4 overflow-x-auto">
        <div className="text-xs font-medium text-muted mb-2">{activeGroup ? activeGroup.name : "Категория"}</div>
        <div className="flex gap-2 w-max">
          {activeGroup && activeGroup.children.length > 0 ? (
            <>
              <CategoryChip label="Все" active={category === groupFilter} onClick={() => setCategory(groupFilter)} />
              {(activeSection ? activeSection.categories : activeGroup.children).map((c) => (
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
        </>
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

        {productTypes.length > 1 && (
          <FilterSection title="Тип продукта">
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Все" active={productType === null} onClick={() => setProductType(null)} />
              {productTypes.map((t) => (
                <CategoryChip key={t} label={t} active={productType === t} onClick={() => setProductType(productType === t ? null : t)} />
              ))}
            </div>
          </FilterSection>
        )}

        {hairTypes.length > 1 && !activeSection?.attr?.hairType && (
          <FilterSection title="Тип волос">
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Любой" active={hairType === null} onClick={() => setHairType(null)} />
              {hairTypes.map((k) => (
                <CategoryChip key={k} label={HAIR_TYPE_LABELS[k]} active={hairType === k} onClick={() => setHairType(hairType === k ? null : k)} />
              ))}
            </div>
          </FilterSection>
        )}

        {skinTypes.length > 1 && (
          <FilterSection title="Тип кожи">
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Любой" active={skinType === null} onClick={() => setSkinType(null)} />
              {skinTypes.map((k) => (
                <CategoryChip key={k} label={SKIN_TYPE_LABELS[k]} active={skinType === k} onClick={() => setSkinType(skinType === k ? null : k)} />
              ))}
            </div>
          </FilterSection>
        )}

        {volumes.length > 1 && (
          <FilterSection title="Объём">
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Любой" active={volume === null} onClick={() => setVolume(null)} />
              {volumes.map((v) => (
                <CategoryChip key={v} label={v} active={volume === v} onClick={() => setVolume(volume === v ? null : v)} />
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

const TILE_BASE =
  "tile-sheen relative h-28 overflow-hidden rounded-[22px] p-3.5 transition active:scale-[0.98] hover:shadow-[var(--shadow-float)]";

function sheenDelay(i: number) {
  return { ["--sheen-delay" as string]: `${(i % 6) * 0.7}s` } as React.CSSProperties;
}

function CategoryTiles() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/catalog?all=1" className={`${TILE_BASE} bg-accent text-white`} style={sheenDelay(0)}>
          <span className="relative text-[15px] font-semibold leading-tight">Все продукты</span>
          <ShoppingBag className="absolute -bottom-1 -right-1 size-20 text-white/25" strokeWidth={1.5} aria-hidden />
        </Link>
        {CATEGORY_GROUPS.map(({ name, label, icon: Icon }, i) => (
          <Link
            key={name}
            href={`/catalog?group=${encodeURIComponent(name)}`}
            className={`${TILE_BASE} bg-card border border-border shadow-[var(--shadow-card)]`}
            style={sheenDelay(i + 1)}
          >
            <span className="relative block max-w-[60%] text-[15px] font-semibold leading-tight">{label ?? name}</span>
            <span className="absolute bottom-2.5 right-2.5 flex items-center justify-center size-14 rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/catalog?promo=1"
        className="tile-sheen relative overflow-hidden rounded-[22px] bg-gradient-to-r from-accent to-accent-strong text-white px-5 py-5 flex items-center justify-between transition active:scale-[0.99]"
      >
        <div className="relative">
          <div className="font-display text-2xl leading-none">Акции</div>
          <div className="text-sm text-white/85 mt-1.5">Скидки и выгодные предложения</div>
        </div>
        <Percent className="relative size-12 text-white/30 shrink-0" strokeWidth={1.75} aria-hidden />
      </Link>
    </div>
  );
}

// Second level of a group with sections: the section tiles, then "Хит продаж".
function GroupMenu({ group }: { group: CategoryGroup }) {
  const [hits, setHits] = useState<Product[]>([]);
  const [hitsLoading, setHitsLoading] = useState(true);
  const filter = groupCategoryFilter(group);

  useEffect(() => {
    fetch(`/api/products/bestsellers?category=${encodeURIComponent(filter)}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setHits(data.products ?? []))
      .catch(() => setHits([]))
      .finally(() => setHitsLoading(false));
  }, [filter]);

  const base = `/catalog?group=${encodeURIComponent(group.name)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <Link href={`${base}&sub=Все`} className={`${TILE_BASE} bg-accent text-white`} style={sheenDelay(0)}>
          <span className="relative block max-w-[70%] text-[15px] font-semibold leading-tight">
            Все продукты <span className="font-normal opacity-90">({group.name.toLowerCase()})</span>
          </span>
          <ShoppingBag className="absolute -bottom-1 -right-1 size-20 text-white/25" strokeWidth={1.5} aria-hidden />
        </Link>
        {group.sections!.map(({ label, icon: Icon }, i) => (
          <Link
            key={label}
            href={`${base}&sub=${encodeURIComponent(label)}`}
            className={`${TILE_BASE} bg-card border border-border shadow-[var(--shadow-card)]`}
            style={sheenDelay(i + 1)}
          >
            <span className="relative block max-w-[60%] text-[15px] font-semibold leading-tight">{label}</span>
            <span className="absolute bottom-2.5 right-2.5 flex items-center justify-center size-14 rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <Flame className="size-5 text-accent" strokeWidth={2} aria-hidden />
          <h2 className="font-display text-xl">Хит продаж</h2>
        </div>
        {hitsLoading ? (
          <ProductGridSkeleton count={4} />
        ) : hits.length === 0 ? (
          <div className="text-sm text-muted">Скоро здесь появятся самые популярные товары.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hits.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Third level: the list of sub-sections of a section (e.g. "Уход для лица" → Умывание, Кремы…) and "Хиты".
function SectionMenu({ group, section }: { group: CategoryGroup; section: NonNullable<CategoryGroup["sections"]>[number] }) {
  const [hits, setHits] = useState<Product[]>([]);
  const filter = groupCategoryFilter(group, section.label);
  const base = `/catalog?group=${encodeURIComponent(group.name)}&sub=${encodeURIComponent(section.label)}`;

  useEffect(() => {
    fetch(`/api/products/bestsellers?category=${encodeURIComponent(filter)}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setHits(data.products ?? []))
      .catch(() => setHits([]));
  }, [filter]);

  const rows = [{ label: "Все продукты", href: `${base}&item=Все` }, ...(section.items ?? []).map((i) => ({ label: i.label, href: `${base}&item=${encodeURIComponent(i.label)}` }))];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-[28px] px-5 py-1 shadow-[var(--shadow-card)]">
        {rows.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="flex items-center justify-between gap-3 py-4 text-[17px] border-b border-border last:border-b-0 transition active:opacity-60"
          >
            {r.label}
            <ChevronRight className="size-5 text-foreground shrink-0" strokeWidth={2} aria-hidden />
          </Link>
        ))}
      </div>

      {hits.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">Хиты</h2>
            <Link
              href={`${base}&item=Все`}
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              Все <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hits.map((product) => (
              <div key={product.id} className="w-44 shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
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
