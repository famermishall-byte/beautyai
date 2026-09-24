"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { Minus, Plus, Search, Volume2, VolumeX, TriangleAlert, BellRing } from "lucide-react";
import type { Branch, Order, OrderItem } from "@/types";
import { useSession } from "@/lib/session-context";
import { isReduced, orderTotal, orderedQty } from "@/lib/orderEdit";
import { buttonClasses } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import {
  NEXT_ORDER_STEP,
  ORDER_STATUSES,
  SALE_STATUSES,
  getOrderStatusAdminLabel,
  isOrderStatus,
} from "@/lib/orderStatus";

// Тот же ключ, что и в admin/stock и admin/product-rating — выбор филиала общий между инструментами
// админки. Раньше жил только в React-состоянии: обновление страницы (F5, pull-to-refresh) сбрасывало
// фильтр обратно на «Все филиалы» — владелец выбирал филиал, видел его сумму, тянул вниз, чтобы
// обновить данные, а сумма вместо этого сама переключалась на общую (жалоба владельца, 24.09).
const BRANCH_FILTER_KEY = "beautyai-admin-branch";

const PERIODS = [{ key: "today" }, { key: "7" }, { key: "30" }, { key: "all" }] as const;
type Period = (typeof PERIODS)[number]["key"];

// The work queue first: orders that still need the seller's action.
const GROUPS = [
  { key: "action", statuses: ["sent", "confirmed"] },
  { key: "problems", statuses: ["sent", "confirmed"] },
  { key: "paid", statuses: ["paid", "shipped"] },
  { key: "done", statuses: ["completed"] },
  { key: "cancelled", statuses: ["cancelled"] },
  { key: "all", statuses: [] as string[] },
] as const;
type GroupKey = (typeof GROUPS)[number]["key"];

const isOpen = (o: Order) => o.status === "sent" || o.status === "confirmed";

/** How long an order has been waiting, e.g. "ждёт 3 ч" / "ждёт 2 дн." (text from messages: orderManager.waiting.*) */
function waiting(t: (key: string, values?: Record<string, number>) => string, iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return t("waiting.justNow");
  if (min < 60) return t("waiting.minutes", { n: min });
  if (min < 48 * 60) return t("waiting.hours", { n: Math.round(min / 60) });
  return t("waiting.days", { n: Math.round(min / 1440) });
}

function inPeriod(iso: string, period: Period) {
  if (period === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "today") return d.toDateString() === now.toDateString();
  return now.getTime() - d.getTime() <= Number(period) * 86_400_000;
}

/** Lines the branch may not be able to fill (only for orders still waiting for action). */
function stockIssues(order: Order): { item: OrderItem; left: number }[] {
  if (!isOpen(order)) return [];
  return order.items
    .filter((it) => it.quantity > 0 && it.stock && it.stock.quantity !== null && it.stock.quantity < it.quantity)
    .map((it) => ({ item: it, left: it.stock!.quantity! }));
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (const [i, freq] of [880, 1175].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.15);
    }
  } catch {
    // звук недоступен — не страшно
  }
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
        active ? "bg-accent text-on-accent" : "bg-accent-soft text-accent hover:bg-accent hover:text-on-accent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function OrderRow({
  order,
  canEdit,
  selected,
  onSelect,
  onUpdated,
}: {
  order: Order;
  canEdit: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onUpdated: (updated: Order) => void;
}) {
  const t = useTranslations("orderManager");
  const ts = useTranslations("orderStatus");
  const locale = useLocale();
  const money = usePrice();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[]>(order.items.map((i) => i.quantity));
  const next = isOrderStatus(order.status) ? NEXT_ORDER_STEP[order.status] : undefined;
  const issues = stockIssues(order);
  const reduced = isReduced(order.items);

  async function send(url: string, method: "PUT" | "PATCH", body: object, okText: string) {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUpdated({ ...data.order, items: data.order.items.map((it: OrderItem, i: number) => ({ ...it, stock: order.items[i]?.stock })) });
        setResult({ ok: true, text: okText });
        return true;
      }
      setResult({ ok: false, text: data.error ?? t("actionFailed") });
    } catch {
      setResult({ ok: false, text: t("offline") });
    } finally {
      setSaving(false);
    }
    return false;
  }

  const changeStatus = (status: string) => send(`/api/admin/orders/${order.id}`, "PUT", { status }, t("statusChanged", { status: getOrderStatusAdminLabel(ts, status) }));

  async function saveEdit() {
    if (await send(`/api/admin/orders/${order.id}`, "PATCH", { quantities: draft }, t("orderChanged"))) setEditing(false);
  }

  const draftTotal = orderTotal(order.items, draft);

  return (
    <div className={["border rounded-control p-4", issues.length > 0 ? "border-warning/50" : "border-border"].join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-2 font-medium">
          {isOpen(order) && (
            <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={t("selectOrder", { number: order.number })} className="size-4 accent-accent" />
          )}
          #{order.number}
        </label>
        <OrderStatusBadge status={order.status} label={getOrderStatusAdminLabel(ts, order.status)} />
      </div>
      <div className="text-sm text-muted mb-2">
        {new Date(order.createdAt).toLocaleString(locale)}
        {isOpen(order) && <span className="ml-2 font-medium text-warning">· {waiting(t, order.createdAt)}</span>}
      </div>
      {order.statusChangedAt && order.status !== "sent" && (
        <div className="text-xs font-medium text-success mb-2">
          {getOrderStatusAdminLabel(ts, order.status)} · {order.statusSource === "whatsapp" ? t("markedWhatsApp") : t("markedInApp")} ·{" "}
          {new Date(order.statusChangedAt).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <div className="text-sm mb-2">
        {order.customerName} · {order.customerPhone}
      </div>

      {issues.length > 0 && (
        <div className="flex gap-2 rounded-control bg-warning-soft text-warning text-sm font-medium px-3 py-2 mb-2">
          <TriangleAlert className="size-4 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
          <span>{t("checkStock")}: {issues.map(({ item, left }) => t("stockIssue", { name: item.name, need: item.quantity, left: left === 0 ? t("noStock") : t("leftQty", { n: left }) })).join("; ")}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 mb-3">
        {order.items.map((item, i) => {
          const q = editing ? draft[i] : item.quantity;
          const max = orderedQty(item);
          const cut = item.quantity < max;
          const stockQ = item.stock?.quantity;
          const lineIssue = isOpen(order) && item.quantity > 0 && stockQ !== null && stockQ !== undefined && stockQ < item.quantity;
          return (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className={q === 0 ? "line-through text-muted" : ""}>
                  {item.name} × {q}
                </span>
                {cut && !editing && (
                  <span className="text-xs text-error ml-2">{item.quantity === 0 ? t("noStock") : t("ordered", { n: max })}</span>
                )}
                {isOpen(order) && item.stock && stockQ !== null && stockQ !== undefined && (
                  <span className={["text-xs ml-2", lineIssue ? "text-warning font-medium" : "text-muted"].join(" ")}>
                    {t("inBranch", { qty: stockQ === 0 ? t("none") : stockQ })}
                  </span>
                )}
              </div>
              {editing ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setDraft((d) => d.map((v, idx) => (idx === i ? Math.max(0, v - 1) : v)))}
                    disabled={saving || draft[i] <= 0}
                    aria-label={t("decrease")}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30 focus-ring"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <button
                    onClick={() => setDraft((d) => d.map((v, idx) => (idx === i ? Math.min(max, v + 1) : v)))}
                    disabled={saving || draft[i] >= max}
                    aria-label={t("increase")}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30 focus-ring"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>
              ) : (
                <span className="shrink-0">{money(item.price * item.quantity)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between font-display text-lg pt-2 border-t border-border">
        <span>{t("total")}</span>
        <span>{money(editing ? draftTotal : order.totalPrice)}</span>
      </div>
      {(reduced || order.originalTotal !== null) && (
        <div className="text-xs text-muted text-right">
          {t("was", { total: money(order.originalTotal ?? order.totalPrice) })} · {order.editedBy === "whatsapp" ? t("editedByWhatsApp") : t("editedInApp")}
          {order.editedAt ? ` · ${new Date(order.editedAt).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
        </div>
      )}
      {order.branch && (
        <div className="text-xs text-muted mt-2">
          {t("branchLine", { name: order.branch.name, address: order.branch.address })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {editing ? (
          <>
            <button
              onClick={saveEdit}
              disabled={saving || draft.every((q, i) => q === order.items[i].quantity)}
              className={buttonClasses({ size: "sm" })}
            >
              {saving ? t("saving") : t("saveTotal", { total: money(draftTotal) })}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setDraft(order.items.map((i) => i.quantity));
              }}
              className="text-sm text-muted underline focus-ring"
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <>
            {next && (
              <button
                onClick={() => changeStatus(next.status)}
                disabled={saving}
                className={buttonClasses({ size: "sm" })}
              >
                {saving ? t("saving") : ts(`next.${next.labelKey}`)}
              </button>
            )}
            {canEdit && order.status !== "cancelled" && (
              <button
                onClick={() => {
                  setDraft(order.items.map((i) => i.quantity));
                  setEditing(true);
                }}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                {t("editItems")}
              </button>
            )}
            <select
              value={order.status}
              disabled={saving}
              onChange={(e) => changeStatus(e.target.value)}
              aria-label={t("changeStatus")}
              className="rounded-full bg-accent-soft text-accent text-xs px-3 py-2 outline-none disabled:opacity-50"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getOrderStatusAdminLabel(ts, status)}
                </option>
              ))}
            </select>
          </>
        )}
        {result && (
          <span aria-live="polite" className={["text-sm font-medium", result.ok ? "text-success" : "text-error"].join(" ")}>
            {result.text}
          </span>
        )}
      </div>
    </div>
  );
}

// Sales = orders that are paid (paid / handed to the courier / completed). Cancelled and unpaid ones are not sales.
function SalesSummary({
  orders,
  allBranches,
  branchOptions,
  branchId,
  onBranch,
}: {
  orders: Order[];
  allBranches: boolean;
  branchOptions: { id: string; name: string; city: string }[];
  branchId: string;
  onBranch: (id: string) => void;
}) {
  const t = useTranslations("orderManager");
  const money = usePrice();
  const [period, setPeriod] = useState<Period>("30");
  const oneBranch = branchId !== "all" ? branchOptions.find((b) => b.id === branchId) : undefined;

  const sales = orders.filter((o) => SALE_STATUSES.includes(o.status) && inPeriod(o.paidAt ?? o.createdAt, period));
  const total = sales.reduce((sum, o) => sum + o.totalPrice, 0);

  const rows = new Map<string, { name: string; city: string; count: number; sum: number }>();
  for (const o of sales) {
    const key = o.branch?.id ?? "—";
    const row = rows.get(key) ?? { name: o.branch?.name ?? t("noBranch"), city: o.branch?.city ?? "", count: 0, sum: 0 };
    row.count++;
    row.sum += o.totalPrice;
    rows.set(key, row);
  }
  const byBranch = [...rows.values()].sort((a, b) => b.sum - a.sum);

  return (
    <div className="surface-card p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-medium">
          {!allBranches ? t("salesOwn") : oneBranch ? t("salesOne", { name: oneBranch.name }) : t("salesAll")}
        </h2>
      </div>

      {allBranches && (
        <label className="block mb-3">
          <span className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</span>
          <select
            value={branchId}
            onChange={(e) => onBranch(e.target.value)}
            className="field"
          >
            <option value="all">{t("allBranchesTotal")}</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.city} — {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {PERIODS.map((p) => (
          <Chip key={p.key} label={t(`periods.${p.key}`)} active={period === p.key} onClick={() => setPeriod(p.key)} />
        ))}
      </div>

      <div className="rounded-control bg-accent-soft px-4 py-4 mb-3">
        <div className="text-xs text-accent-strong/80">{oneBranch ? t("soldOne", { name: oneBranch.name }) : allBranches ? t("soldAll") : t("soldTotal")}</div>
        <div className="font-display text-3xl tabular-nums">{money(total)}</div>
        <div className="text-sm text-accent-strong/80 mt-0.5">{t("paidOrders", { n: sales.length })}</div>
      </div>

      {allBranches && !oneBranch && byBranch.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-3">{t("branch")}</th>
                <th className="py-2 pr-3 text-right">{t("orders")}</th>
                <th className="py-2 text-right">{t("sum")}</th>
              </tr>
            </thead>
            <tbody>
              {byBranch.map((r) => (
                <tr key={`${r.city}-${r.name}`} className="border-b border-border">
                  <td className="py-2 pr-3">
                    {r.city ? `${r.city} — ` : ""}
                    {r.name}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(r.sum)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3">{t("totalAllBranches")}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{sales.length}</td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        {t("salesNote")}
      </p>
    </div>
  );
}

const PAGE = 30;

export function OrderManager() {
  const t = useTranslations("orderManager");
  const locale = useLocale();
  const { session } = useSession();
  const allBranches = session?.role === "owner" || session?.role === "admin";

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState<GroupKey>("action");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [allBranchList, setAllBranchList] = useState<Branch[]>([]);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [newestFirst, setNewestFirst] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [alert, setAlert] = useState("");
  const knownNew = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);

  async function load() {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    if (!res.ok) setError(data.error ?? t("loadFailed"));
    else setError("");
    const list: Order[] = data.orders ?? [];
    setOrders(list);
    setUpdatedAt(new Date());

    // A new order arrived → tell the seller (banner + optional sound) so they don't have to watch WhatsApp chats.
    const newIds = new Set(list.filter((o) => o.status === "sent").map((o) => o.id));
    if (knownNew.current) {
      const fresh = [...newIds].filter((id) => !knownNew.current!.has(id));
      if (fresh.length > 0) {
        setAlert(fresh.length === 1 ? t("newOrder") : t("newOrders", { n: fresh.length }));
        if (soundRef.current) beep();
      }
    }
    knownNew.current = newIds;
    document.title = newIds.size > 0 ? `(${newIds.size}) ${t("title")}` : t("title");
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const prevTitle = document.title;
    // A seller taps a link in WhatsApp → the order changes in the database. Re-read every 20 s (and when the tab
    // comes back into focus) so the admin sees it without reloading.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (!allBranches) return;
    fetch("/api/admin/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches?: Branch[] }) => setAllBranchList(data.branches ?? []))
      .catch(() => {});
  }, [allBranches]);

  useEffect(() => {
    // localStorage недоступен при SSR — читаем только после монтирования, как и везде в админке.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(BRANCH_FILTER_KEY);
    } catch {
      // недоступно — просто останется «Все филиалы»
    }
    if (stored) Promise.resolve().then(() => setBranchFilter(stored));
  }, []);

  function selectBranchFilter(id: string) {
    setBranchFilter(id);
    setShown(PAGE);
    try {
      localStorage.setItem(BRANCH_FILTER_KEY, id);
    } catch {
      // недоступно — выбор просто не запомнится
    }
  }

  function toggleSound() {
    const on = !soundOn;
    setSoundOn(on);
    soundRef.current = on;
    if (on) beep(); // also unlocks audio in the browser (needs a tap)
  }

  function handleUpdated(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? { ...updated, branch: updated.branch ?? o.branch } : o)) : prev));
  }

  const list = orders ?? [];
  const branches = [...new Map(list.filter((o) => o.branch).map((o) => [o.branch.id, o.branch])).values()].sort(
    (a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru")
  );
  // Options for the branch selector: every branch of the store (even one with no orders yet), by city then name.
  const branchOptions = (allBranchList.length > 0 ? allBranchList : branches).slice().sort((a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru"));
  const byBranch = branchFilter === "all" ? list : list.filter((o) => o.branch?.id === branchFilter);
  const chosenBranch = branchFilter === "all" ? undefined : branchOptions.find((b) => b.id === branchFilter);
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "").replace(/^0+/, "");
  const matchesQuery = (o: Order) => {
    const text = [o.number, o.customerName, o.customerPhone, ...o.items.map((i) => i.name)].join(" ").toLowerCase();
    if (text.includes(q)) return true;
    // "17" / "00017" find BA-00017; digits of a phone find it however it was typed
    if (qDigits.length >= 2) {
      if (o.number.replace(/\D/g, "").replace(/^0+/, "").includes(qDigits)) return true;
      if (o.customerPhone.replace(/\D/g, "").includes(qDigits)) return true;
    }
    return false;
  };
  const searched = q ? byBranch.filter(matchesQuery) : byBranch;

  const inGroup = (o: Order, key: GroupKey) => {
    const g = GROUPS.find((x) => x.key === key)!;
    if (key === "all") return true;
    if (key === "problems") return isOpen(o) && stockIssues(o).length > 0;
    return (g.statuses as readonly string[]).includes(o.status);
  };
  const countOf = (key: GroupKey) => searched.filter((o) => inGroup(o, key)).length;
  const filtered = searched
    .filter((o) => (q ? true : inGroup(o, group)))
    // Newest first by default (a fresh order is at the top); "сначала старые" puts whoever has waited longest first.
    .sort((a, b) => (newestFirst ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));

  const visibleOpenIds = filtered.slice(0, shown).filter(isOpen).map((o) => o.id);
  const selectedIds = [...selected].filter((id) => filtered.some((o) => o.id === id));

  async function markSelectedPaid() {
    setBulkBusy(true);
    setBulkResult("");
    let done = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          handleUpdated(data.order);
          done++;
        }
      } catch {
        // пропускаем — итог покажем ниже
      }
    }
    setSelected(new Set());
    setBulkBusy(false);
    setBulkResult(done === selectedIds.length ? t("bulkDone", { n: done }) : t("bulkPartial", { done, total: selectedIds.length }));
  }

  return (
    <div>
      {orders !== null && (
        <SalesSummary
          orders={byBranch}
          allBranches={allBranches}
          branchOptions={branchOptions}
          branchId={branchFilter}
          onBranch={selectBranchFilter}
        />
      )}

      <div className="surface-card p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-medium">{t("title")}</h2>
          <button
            onClick={toggleSound}
            className={["flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition", soundOn ? "bg-success-soft text-success" : "bg-accent-soft text-accent"].join(" ")}
          >
            {soundOn ? <Volume2 className="size-3.5" aria-hidden /> : <VolumeX className="size-3.5" aria-hidden />}
            {soundOn ? t("soundOn") : t("soundOff")}
          </button>
        </div>
        <p className="text-sm text-muted mb-1">
          {t("queueIntro")}
        </p>
        <p className="text-xs text-muted mb-4">
          {t("refreshEvery")}{updatedAt ? ` · ${updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
        </p>

        {alert && (
          <button onClick={() => setAlert("")} className="w-full flex items-center gap-2 text-left rounded-control bg-accent text-on-accent px-4 py-3 text-sm font-semibold mb-3 focus-ring">
            <BellRing className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            {alert} <span className="font-normal opacity-80">— {t("tapToHide")}</span>
          </button>
        )}

        {error && <p className="text-sm text-error font-medium mb-3">{error}</p>}
        {orders === null && <p className="text-muted text-sm">{t("loading")}</p>}
        {orders !== null && orders.length === 0 && !error && <p className="text-muted text-sm">{t("empty")}</p>}

        {orders && orders.length > 0 && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted" strokeWidth={2} aria-hidden />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder={t("searchPlaceholder")}
                className="field pl-10 pr-4"
              />
            </div>
            {q && (
              <div className="flex items-center justify-between gap-3 mb-3 text-sm">
                <span className="font-medium">
                  {t("found", { n: filtered.length })} <span className="font-normal text-muted">({t("searchAll")})</span>
                </span>
                <button onClick={() => setQuery("")} className="text-accent underline shrink-0 focus-ring">
                  {t("resetSearch")}
                </button>
              </div>
            )}

            <label className="flex items-center justify-between gap-3 mb-3 text-sm text-muted">
              {t("sortLabel")}
              <select
                value={newestFirst ? "new" : "old"}
                onChange={(e) => setNewestFirst(e.target.value === "new")}
                className="field"
              >
                <option value="new">{t("newestFirst")}</option>
                <option value="old">{t("oldestFirst")}</option>
              </select>
            </label>

            {allBranches && chosenBranch && (
              <div className="flex items-center justify-between gap-3 mb-3 text-sm">
                <span>
                  {t.rich("branchOrders", { name: chosenBranch.name, b: (chunks) => <span className="font-semibold">{chunks}</span> })}
                </span>
                <button onClick={() => setBranchFilter("all")} className="text-accent underline shrink-0 focus-ring">
                  {t("showAllBranches")}
                </button>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
              {GROUPS.map((g) => (
                <Chip
                  key={g.key}
                  label={`${t(`groups.${g.key}`)} · ${countOf(g.key)}`}
                  active={group === g.key}
                  onClick={() => {
                    setGroup(g.key);
                    setShown(PAGE);
                    setSelected(new Set());
                  }}
                />
              ))}
            </div>

            {bulkResult && <p className="text-sm font-medium text-success mb-3">{bulkResult}</p>}

            {(group === "action" || group === "problems") && visibleOpenIds.length > 1 && (
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                <button onClick={() => setSelected(new Set(visibleOpenIds))} className="text-accent underline focus-ring">
                  {t("selectAll")}
                </button>
                {selectedIds.length > 0 && (
                  <>
                    <button onClick={() => setSelected(new Set())} className="text-muted underline focus-ring">
                      {t("clearSelection")}
                    </button>
                    <button
                      onClick={markSelectedPaid}
                      disabled={bulkBusy}
                      className={buttonClasses({ variant: "success", size: "sm" })}
                    >
                      {bulkBusy ? t("marking") : t("paymentReceivedCount", { n: selectedIds.length })}
                    </button>
                  </>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="text-muted text-sm">{q ? t("nothingFor", { query: query.trim() }) : group === "action" ? t("allHandled") : t("emptyGroup")}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.slice(0, shown).map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    canEdit={order.status !== "paid" && order.status !== "shipped" && order.status !== "completed" ? true : allBranches}
                    selected={selected.has(order.id)}
                    onSelect={(checked) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(order.id);
                        else next.delete(order.id);
                        return next;
                      })
                    }
                    onUpdated={handleUpdated}
                  />
                ))}
              </div>
            )}

            {shown < filtered.length && (
              <button
                onClick={() => setShown((n) => n + PAGE)}
                className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-medium transition hover:border-accent/40 focus-ring"
              >
                {t("showMore", { n: Math.min(PAGE, filtered.length - shown) })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
