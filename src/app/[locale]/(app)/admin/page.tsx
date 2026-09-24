"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, ClipboardList, FileSpreadsheet, LayoutList, Megaphone, MessageSquare, Package, Store, Trophy, UserCog, Users, type LucideIcon } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { Link } from "@/i18n/navigation";

// The admin home is a menu of icon tiles; each section opens on its own page (with the back arrow in the header).
type Tile = { href: string; label: string; hint: string; icon: LucideIcon; accent?: boolean; badge?: number; roles?: string[] };

export default function AdminHome() {
  const t = useTranslations("adminHome");
  const { session } = useSession();
  const role = session?.role ?? "";
  const branchManager = role === "branch_manager";
  const [newOrders, setNewOrders] = useState<number | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    const loadOrders = () =>
      fetch("/api/admin/orders")
        .then((res) => res.json())
        .then((data: { orders?: { status: string }[] }) => setNewOrders((data.orders ?? []).filter((o) => o.status === "sent").length))
        .catch(() => setNewOrders(null));
    loadOrders();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadOrders();
    }, 30_000);
    fetch("/api/admin/branches")
      .then((res) => (res.ok ? res.json() : { branches: undefined }))
      .then((data: { branches?: unknown[] }) => setBranchCount(data.branches ? data.branches.length : null))
      .catch(() => setBranchCount(null));
    return () => clearInterval(timer);
  }, []);

  const tiles: Tile[] = [
    // A branch manager works with their own branch only; the all-branches picture belongs to the owner / admin.
    { href: "/admin/stock", label: branchManager ? t("stockBranch") : t("stock"), hint: branchManager ? t("yourBranch") : t("stockHint"), icon: Package, accent: true },
    {
      href: "/admin/orders",
      label: branchManager ? t("ordersBranch") : t("orders"),
      hint: newOrders ? t("newCount", { n: newOrders }) : branchManager ? t("onlyYourBranch") : t("allBranches"),
      icon: ClipboardList,
      badge: newOrders ?? 0,
    },
    { href: "/admin/product-rating", label: t("rating"), hint: branchManager ? t("onlyYourBranch") : t("ratingHint"), icon: Trophy, roles: ["owner", "admin", "branch_manager"] },
    { href: "/admin/staff", label: t("staff"), hint: t("staffHint"), icon: Users, roles: ["owner"] },
    { href: "/admin/branches", label: t("branches"), hint: branchCount !== null ? t("totalCount", { n: branchCount }) : t("branchesHint"), icon: Store, roles: ["owner", "admin"] },
    { href: "/admin/products", label: t("upload"), hint: t("uploadHint"), icon: FileSpreadsheet, roles: ["owner", "admin"] },
    { href: "/admin/catalog", label: t("catalog"), hint: t("catalogHint"), icon: LayoutList, roles: ["owner", "admin"] },
    { href: "/admin/promo", label: t("promo"), hint: t("promoHint"), icon: Megaphone, roles: ["owner", "admin"] },
    {
      href: "/admin/feedback",
      label: t("feedback"),
      hint: branchManager ? t("onlyYourBranch") : t("allBranches"),
      icon: MessageSquare,
      roles: ["owner", "admin", "branch_manager"],
    },
    { href: "/admin/profile", label: t("store"), hint: t("storeHint"), icon: Building2, roles: ["owner", "admin"] },
    { href: "/admin/settings", label: t("account"), hint: t("accountHint"), icon: UserCog },
  ];

  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-3xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">{t("title")}</h1>
      <p className="text-sm text-muted mb-6">{t("chooseSection")}</p>

      <div className="grid grid-cols-2 gap-3">
        {tiles.filter((t) => !t.roles || t.roles.includes(role)).map(({ href, label, hint, icon: Icon, accent, badge }, i) => (
          <Link
            key={href}
            href={href}
            style={{ ["--sheen-delay" as string]: `${(i % 6) * 0.7}s` } as React.CSSProperties}
            className={[
              "tile-sheen relative h-32 overflow-hidden rounded-tile p-4 transition active:scale-[0.98] hover:shadow-float",
              accent ? "bg-accent text-on-accent" : "bg-card border border-border shadow-card",
            ].join(" ")}
          >
            <span className="relative block max-w-[65%] text-base font-semibold leading-tight">{label}</span>
            <span className={["relative block max-w-[65%] text-xs mt-1", accent ? "text-on-accent/85" : "text-muted"].join(" ")}>{hint}</span>
            <span
              className={[
                "absolute bottom-3 right-3 flex items-center justify-center size-14 rounded-card",
                accent ? "bg-card/20 text-on-accent" : "bg-accent-soft text-accent",
              ].join(" ")}
            >
              <Icon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
            {badge ? (
              <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-accent text-on-accent text-xs font-semibold flex items-center justify-center">
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
