"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkle } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { usePrice } from "@/lib/use-price";
import type { Branch } from "@/types";

// Тот же ключ, что и в /admin/stock — выбор филиала общий для обоих инструментов, владельцу
// не нужно выбирать его заново, переключаясь между «Остатками» и «Рейтингом товаров».
const BRANCH_KEY = "beautyai-admin-branch";

type Item = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  price: number;
  soldQty: number;
};

const MEDAL = ["bg-[#f5c542] text-[#5c4400]", "bg-[#c6c6d0] text-[#3a3a42]", "bg-[#d99a5b] text-[#4a2e10]"];

export default function AdminProductRatingPage() {
  const t = useTranslations("adminProductRating");
  const price = usePrice();
  const { session } = useSession();
  const isBranchManager = session?.role === "branch_manager";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickedBranch, setPickedBranch] = useState<string | null>(null);
  const branchId = isBranchManager ? (session?.branchId ?? null) : pickedBranch;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
        setPickedBranch(stored && list.some((b) => b.id === stored) ? stored : (list[0]?.id ?? null));
      })
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (!branchId) return;
    // Data fetching triggered by the branch selection — React's documented fetch-in-effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/product-rating?branchId=${branchId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("loadError"));
        setItems(data.items);
        setError("");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId, t]);

  function selectBranch(id: string) {
    setPickedBranch(id);
    try {
      localStorage.setItem(BRANCH_KEY, id);
    } catch {
      // недоступно — выбор просто не запомнится
    }
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-3xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">{t("title")}</h1>
      <p className="text-sm text-muted mb-5">{t("intro")}</p>

      {isBranchManager ? (
        <div className="mb-4 rounded-[var(--radius-control)] bg-accent-soft px-4 py-3 text-sm">
          {t.rich("yourBranch", { name: branches.find((b) => b.id === branchId)?.name ?? "…", b: (chunks) => <span className="font-semibold">{chunks}</span> })}
        </div>
      ) : (
        <>
          <label className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</label>
          <select
            value={branchId ?? ""}
            onChange={(e) => selectBranch(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent mb-5"
          >
            {branches.length === 0 && <option value="">{t("noBranches")}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.city} — {b.name}
              </option>
            ))}
          </select>
        </>
      )}

      {error && <div className="rounded-xl bg-error-soft text-error text-sm px-4 py-3 mb-3">{error}</div>}

      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted mx-auto my-8" aria-hidden />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li key={item.id} className="bg-card rounded-[var(--radius-card)] border border-border p-3 flex items-center gap-3">
              <span
                className={[
                  "shrink-0 size-8 rounded-full flex items-center justify-center text-sm font-bold",
                  i < 3 ? MEDAL[i] : "bg-accent-soft text-accent",
                ].join(" ")}
              >
                {i + 1}
              </span>

              <div className="w-12 h-12 shrink-0 rounded-xl bg-accent-soft overflow-hidden flex items-center justify-center">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Sparkle className="size-4 text-accent/35" strokeWidth={1.4} aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted truncate">{item.brand}</div>
                <div className="text-sm font-medium leading-snug line-clamp-2">{item.name}</div>
                <div className="text-xs text-muted mt-0.5">{price(item.price)}</div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-lg font-display tabular-nums leading-none">{item.soldQty}</div>
                <div className="text-[11px] text-muted mt-0.5">{t("sold")}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
