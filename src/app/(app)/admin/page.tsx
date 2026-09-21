"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardList, FileSpreadsheet, LayoutList, MessageSquare, Package, Store, UserCog, type LucideIcon } from "lucide-react";

// The admin home is a menu of icon tiles; each section opens on its own page (with the back arrow in the header).
type Tile = { href: string; label: string; hint: string; icon: LucideIcon; accent?: boolean; badge?: number };

export default function AdminHome() {
  const [newOrders, setNewOrders] = useState<number | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data: { orders?: { status: string }[] }) => setNewOrders((data.orders ?? []).filter((o) => o.status === "sent").length))
      .catch(() => setNewOrders(null));
    fetch("/api/admin/branches")
      .then((res) => res.json())
      .then((data: { branches?: unknown[] }) => setBranchCount((data.branches ?? []).length))
      .catch(() => setBranchCount(null));
  }, []);

  const tiles: Tile[] = [
    { href: "/admin/stock", label: "Остатки", hint: "Что есть и что заканчивается", icon: Package, accent: true },
    { href: "/admin/orders", label: "Заказы", hint: newOrders ? `Новых: ${newOrders}` : "Заказы покупателей", icon: ClipboardList, badge: newOrders ?? 0 },
    { href: "/admin/branches", label: "Филиалы", hint: branchCount !== null ? `Всего: ${branchCount}` : "Адреса и WhatsApp", icon: Store },
    { href: "/admin/products", label: "Загрузка товаров", hint: "Excel и остатки из программы", icon: FileSpreadsheet },
    { href: "/admin/catalog", label: "Каталог", hint: "Список всех товаров", icon: LayoutList },
    { href: "/admin/feedback", label: "Обратная связь", hint: "Сообщения покупателей", icon: MessageSquare },
    { href: "/admin/profile", label: "Магазин", hint: "Название магазина", icon: Building2 },
    { href: "/admin/settings", label: "Аккаунт", hint: "Почта, пароль, доступ", icon: UserCog },
  ];

  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-3xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Панель магазина</h1>
      <p className="text-sm text-muted mb-6">Выберите раздел.</p>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ href, label, hint, icon: Icon, accent, badge }, i) => (
          <Link
            key={href}
            href={href}
            style={{ ["--sheen-delay" as string]: `${(i % 6) * 0.7}s` } as React.CSSProperties}
            className={[
              "tile-sheen relative h-32 overflow-hidden rounded-[22px] p-4 transition active:scale-[0.98] hover:shadow-[var(--shadow-float)]",
              accent ? "bg-accent text-white" : "bg-card border border-border shadow-[var(--shadow-card)]",
            ].join(" ")}
          >
            <span className="relative block max-w-[65%] text-base font-semibold leading-tight">{label}</span>
            <span className={["relative block max-w-[65%] text-xs mt-1", accent ? "text-white/85" : "text-muted"].join(" ")}>{hint}</span>
            <span
              className={[
                "absolute bottom-3 right-3 flex items-center justify-center size-14 rounded-2xl",
                accent ? "bg-white/20 text-white" : "bg-accent-soft text-accent",
              ].join(" ")}
            >
              <Icon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
            {badge ? (
              <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center">
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
