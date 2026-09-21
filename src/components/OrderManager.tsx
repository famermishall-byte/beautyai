"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types";
import { useSession } from "@/lib/session-context";
import {
  NEXT_ORDER_STEP,
  ORDER_STATUSES,
  ORDER_STATUS_ADMIN_LABELS,
  SALE_STATUSES,
  getOrderStatusAdminLabel,
  isOrderStatus,
} from "@/lib/orderStatus";

const PILL: Record<string, string> = {
  sent: "bg-accent-soft text-accent",
  confirmed: "bg-warning-soft text-warning",
  paid: "bg-success-soft text-success",
  shipped: "bg-success-soft text-success",
  completed: "bg-border text-foreground",
  cancelled: "bg-error-soft text-error",
};

const PERIODS = [
  { key: "today", label: "Сегодня" },
  { key: "7", label: "7 дней" },
  { key: "30", label: "30 дней" },
  { key: "all", label: "Всё время" },
] as const;
type Period = (typeof PERIODS)[number]["key"];

const money = (n: number) => `${n.toLocaleString("ru-RU")} сом`;

function inPeriod(iso: string, period: Period) {
  if (period === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "today") return d.toDateString() === now.toDateString();
  return now.getTime() - d.getTime() <= Number(period) * 86_400_000;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
        active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function OrderRow({ order, onUpdated }: { order: Order; onUpdated: (updated: Order) => void }) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const next = isOrderStatus(order.status) ? NEXT_ORDER_STEP[order.status] : undefined;

  async function change(status: string) {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUpdated(data.order);
        setResult({ ok: true, text: `✓ Статус: «${getOrderStatusAdminLabel(status)}»` });
      } else {
        setResult({ ok: false, text: data.error ?? "Не удалось изменить статус." });
      }
    } catch {
      setResult({ ok: false, text: "Нет связи с сервером. Статус не изменён." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-black/5 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium">#{order.number}</span>
        <span className={["text-xs font-medium rounded-full px-2.5 py-1", PILL[order.status] ?? "bg-border text-muted"].join(" ")}>
          {getOrderStatusAdminLabel(order.status)}
        </span>
      </div>
      <div className="text-sm text-muted mb-2">{new Date(order.createdAt).toLocaleString("ru-RU")}</div>
      <div className="text-sm mb-2">
        {order.customerName} · {order.customerPhone}
      </div>
      <div className="flex flex-col gap-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{(item.price * item.quantity).toLocaleString("ru-RU")} сом</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-display text-lg pt-2 border-t border-black/10">
        <span>Итого</span>
        <span>{money(order.totalPrice)}</span>
      </div>
      {order.branch && (
        <div className="text-xs text-muted mt-2">
          Филиал: {order.branch.name} · {order.branch.address}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {next && (
          <button
            onClick={() => change(next.status)}
            disabled={saving}
            className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {saving ? "Сохраняем…" : next.label}
          </button>
        )}
        <select
          value={order.status}
          disabled={saving}
          onChange={(e) => change(e.target.value)}
          aria-label="Изменить статус заказа"
          className="rounded-full bg-accent-soft text-accent text-xs px-3 py-2 outline-none disabled:opacity-50"
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_ADMIN_LABELS[status]}
            </option>
          ))}
        </select>
        {result && <span aria-live="polite" className={["text-sm font-medium", result.ok ? "text-success" : "text-error"].join(" ")}>{result.text}</span>}
      </div>
    </div>
  );
}

// Sales = orders that are paid (paid / handed to the courier / completed). Cancelled and unpaid ones are not sales.
function SalesSummary({ orders, allBranches }: { orders: Order[]; allBranches: boolean }) {
  const [period, setPeriod] = useState<Period>("30");

  const sales = orders.filter((o) => SALE_STATUSES.includes(o.status) && inPeriod(o.paidAt ?? o.createdAt, period));
  const total = sales.reduce((sum, o) => sum + o.totalPrice, 0);

  const rows = new Map<string, { name: string; city: string; count: number; sum: number }>();
  for (const o of sales) {
    const key = o.branch?.id ?? "—";
    const row = rows.get(key) ?? { name: o.branch?.name ?? "Без филиала", city: o.branch?.city ?? "", count: 0, sum: 0 };
    row.count++;
    row.sum += o.totalPrice;
    rows.set(key, row);
  }
  const byBranch = [...rows.values()].sort((a, b) => b.sum - a.sum);

  return (
    <div className="bg-card rounded-2xl border border-black/5 p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-medium">{allBranches ? "Продажи по всем филиалам" : "Продажи вашего филиала"}</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} active={period === p.key} onClick={() => setPeriod(p.key)} />
        ))}
      </div>

      <div className="rounded-xl bg-accent-soft px-4 py-4 mb-3">
        <div className="text-xs text-accent-strong/80">Итого продано</div>
        <div className="font-display text-3xl tabular-nums">{money(total)}</div>
        <div className="text-sm text-accent-strong/80 mt-0.5">Оплаченных заказов: {sales.length}</div>
      </div>

      {allBranches && byBranch.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-black/10">
                <th className="py-2 pr-3">Филиал</th>
                <th className="py-2 pr-3 text-right">Заказов</th>
                <th className="py-2 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {byBranch.map((r) => (
                <tr key={`${r.city}-${r.name}`} className="border-b border-black/5">
                  <td className="py-2 pr-3">
                    {r.city ? `${r.city} — ` : ""}
                    {r.name}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(r.sum)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3">Итого по всем филиалам</td>
                <td className="py-2 pr-3 text-right tabular-nums">{sales.length}</td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        В продажи входят заказы со статусом «Оплачен», «Передан курьеру» и «Выполнен». Новые, неоплаченные и отменённые заказы не считаются.
      </p>
    </div>
  );
}

const PAGE = 30;

export function OrderManager() {
  const { session } = useSession();
  const allBranches = session?.role === "owner" || session?.role === "admin";

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);

  async function load() {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Не удалось загрузить заказы.");
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function handleUpdated(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev));
  }

  const list = orders ?? [];
  const branches = [...new Map(list.filter((o) => o.branch).map((o) => [o.branch.id, o.branch])).values()].sort(
    (a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru")
  );
  const byBranch = branchFilter === "all" ? list : list.filter((o) => o.branch?.id === branchFilter);
  const countOf = (s: string) => (s === "all" ? byBranch.length : byBranch.filter((o) => o.status === s).length);
  const filtered = statusFilter === "all" ? byBranch : byBranch.filter((o) => o.status === statusFilter);

  return (
    <div>
      {orders !== null && <SalesSummary orders={list} allBranches={allBranches} />}

      <div className="bg-card rounded-2xl border border-black/5 p-6">
        <h2 className="font-medium mb-1">Заказы</h2>
        <p className="text-sm text-muted mb-4">
          Двигайте заказ по шагам кнопкой ниже (или ссылкой из WhatsApp): подтверждён → оплачен → передан курьеру → выполнен.
        </p>

        {error && <p className="text-sm text-error font-medium mb-3">{error}</p>}
        {orders === null && <p className="text-muted text-sm">Загружаем…</p>}
        {orders !== null && orders.length === 0 && !error && <p className="text-muted text-sm">Заказов пока нет.</p>}

        {orders && orders.length > 0 && (
          <>
            {allBranches && branches.length > 1 && (
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setShown(PAGE);
                }}
                aria-label="Филиал"
                className="w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent mb-3"
              >
                <option value="all">Все филиалы</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.city} — {b.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
              {["all", ...ORDER_STATUSES].map((s) => (
                <Chip
                  key={s}
                  label={`${s === "all" ? "Все" : ORDER_STATUS_ADMIN_LABELS[s as keyof typeof ORDER_STATUS_ADMIN_LABELS]} · ${countOf(s)}`}
                  active={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s);
                    setShown(PAGE);
                  }}
                />
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted text-sm">Нет заказов с таким статусом.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.slice(0, shown).map((order) => (
                  <OrderRow key={order.id} order={order} onUpdated={handleUpdated} />
                ))}
              </div>
            )}

            {shown < filtered.length && (
              <button
                onClick={() => setShown((n) => n + PAGE)}
                className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-medium transition hover:border-accent/40"
              >
                Показать ещё {Math.min(PAGE, filtered.length - shown)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
