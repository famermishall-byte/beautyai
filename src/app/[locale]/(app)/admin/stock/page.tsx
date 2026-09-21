"use client";

import { useEffect, useState } from "react";
import { Search, Sparkle } from "lucide-react";
import { STOCK_STATUS_LABELS, type StockStatus } from "@/lib/stock";
import { useSession } from "@/lib/session-context";
import type { Branch } from "@/types";

const BRANCH_KEY = "beautyai-admin-branch";
const PAGE_SIZE = 50;

type Item = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  quantity: number | null;
  updatedAt: string | null;
  status: StockStatus;
};
type Counts = Record<StockStatus | "all", number>;

const FILTERS: { key: StockStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "out", label: "Нет в наличии" },
  { key: "low", label: "Мало" },
  { key: "ok", label: "В наличии" },
  { key: "unknown", label: "Не заполнено" },
];

const PILL: Record<StockStatus, string> = {
  ok: "bg-success-soft text-success",
  low: "bg-warning-soft text-warning",
  out: "bg-error-soft text-error",
  unknown: "bg-border text-muted",
};

function formatWhen(iso: string | null) {
  if (!iso) return "ещё не задавался";
  const d = new Date(iso);
  return `обновлено ${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminStockPage() {
  const { session } = useSession();
  const isBranchManager = session?.role === "branch_manager";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickedBranch, setBranchId] = useState<string | null>(null);
  // A branch manager works only with their own branch; everyone else picks one.
  const branchId = isBranchManager ? (session?.branchId ?? null) : pickedBranch;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"problems" | "name">("problems");
  const [justSaved, setJustSaved] = useState<Record<string, true>>({});

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => {
        const list = [...(data.branches ?? [])].sort((a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru"));
        setBranches(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_KEY);
        } catch {
          // недоступно — просто не запомним выбор
        }
        setBranchId(stored && list.some((b) => b.id === stored) ? stored : (list[0]?.id ?? null));
      })
      .catch(() => setBranches([]));
  }, []);

  // Debounce the search box so the list isn't reloaded on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!branchId) return;
    const params = new URLSearchParams({ branchId, status, page: String(page), sort });
    if (search) params.set("q", search);
    // Data fetching triggered by filter changes — React's documented fetch-in-effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/stock?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
        setItems(data.items);
        setTotal(data.total);
        setCounts(data.counts);
        setError("");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId, search, status, page, sort]);

  function selectBranch(id: string) {
    setBranchId(id);
    setPage(1);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {
      // недоступно — выбор просто не запомнится
    }
  }

  async function saveQuantity(item: Item, quantity: number): Promise<string | null> {
    const res = await fetch("/api/admin/stock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, productId: item.id, quantity }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Не удалось сохранить";
    setJustSaved((f) => ({ ...f, [item.id]: true }));
    setTimeout(() => setJustSaved((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== item.id))), 2500);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: data.quantity, updatedAt: data.updatedAt, status: data.status } : i)));
    setCounts((c) => {
      if (!c) return c;
      const next = { ...c };
      next[item.status]--;
      next[data.status as StockStatus]++;
      return next;
    });
    return null;
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-3xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Остатки по филиалам</h1>
      <p className="text-sm text-muted mb-5">
        Покупатели видят только статус: «В наличии», «Мало» (до 3 шт.) или «Нет в наличии». Точные числа вводите здесь или
        загружайте из вашей программы — они нужны только вам.
      </p>

      {isBranchManager ? (
        <div className="mb-4 rounded-[var(--radius-control)] bg-accent-soft px-4 py-3 text-sm">
          Ваш филиал: <span className="font-semibold">{branches.find((b) => b.id === branchId)?.name ?? "…"}</span>
        </div>
      ) : (
        <>
      <label className="block text-xs font-medium text-muted mb-1.5">Филиал</label>
      <select
        value={branchId ?? ""}
        onChange={(e) => selectBranch(e.target.value)}
        className="w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent mb-4"
      >
        {branches.length === 0 && <option value="">Нет филиалов</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.city} — {b.name}
          </option>
        ))}
      </select>
        </>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название, бренд или артикул"
          className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setStatus(f.key);
              setPage(1);
            }}
            className={[
              "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
              status === f.key ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
            ].join(" ")}
          >
            {f.label}
            {counts ? ` · ${counts[f.key]}` : ""}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 text-sm">
        <span className="text-muted">Показано {items.length} из {total}</span>
        <label className="flex items-center gap-2 text-muted">
          Порядок
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "problems" | "name");
              setPage(1);
            }}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="problems">Сначала проблемные</option>
            <option value="name">По названию</option>
          </select>
        </label>
      </div>

      {error && <div className="rounded-xl bg-error-soft text-error text-sm px-4 py-3 mb-3">{error}</div>}

      {loading && items.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">Загружаем…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">Ничего не найдено.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <StockRow key={`${item.id}:${item.quantity}`} item={item} onSave={saveQuantity} savedFlash={!!justSaved[item.id]} />
          ))}
        </ul>
      )}

      {items.length < total && (
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={loading}
          className="mt-4 w-full rounded-full border border-border bg-card py-3 text-sm font-medium transition hover:border-accent/40 disabled:opacity-50"
        >
          Показать ещё ({Math.min(PAGE_SIZE, total - items.length)})
        </button>
      )}
    </main>
  );
}

function StockRow({ item, onSave, savedFlash }: { item: Item; onSave: (item: Item, quantity: number) => Promise<string | null>; savedFlash: boolean }) {
  const [draft, setDraft] = useState(item.quantity === null ? "" : String(item.quantity));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function commit(value: string) {
    if (value === "" || value === String(item.quantity)) return;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      setError("Целое число от 0");
      return;
    }
    setSaving(true);
    setError("");
    const err = await onSave(item, n);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <li className="bg-card rounded-[var(--radius-card)] border border-border p-3 flex items-center gap-3">
      <div className="w-14 h-14 shrink-0 rounded-xl bg-accent-soft overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Sparkle className="size-5 text-accent/35" strokeWidth={1.4} aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted truncate">
          {item.brand} · {item.sku}
        </div>
        <div className="text-sm font-medium leading-snug line-clamp-2">{item.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={["text-[11px] font-medium rounded-full px-2 py-0.5", PILL[item.status]].join(" ")}>{STOCK_STATUS_LABELS[item.status]}</span>
          {savedFlash ? (
            <span className="text-[11px] font-semibold text-success">✓ Сохранено</span>
          ) : saving ? (
            <span className="text-[11px] text-muted">Сохраняем…</span>
          ) : (
            <span className="text-[11px] text-muted truncate">{formatWhen(item.updatedAt)}</span>
          )}
        </div>
        {error && <div className="text-[11px] text-error mt-1">{error}</div>}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          placeholder="—"
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-label={`Остаток: ${item.name}`}
          className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
        <button
          onClick={() => {
            setDraft("0");
            commit("0");
          }}
          disabled={saving || item.quantity === 0}
          className="text-[11px] font-medium text-error hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Нет в наличии
        </button>
      </div>
    </li>
  );
}
