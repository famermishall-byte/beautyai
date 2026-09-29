"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Chip } from "@/components/ui/Chip";
import { BannerManager } from "@/components/BannerManager";
import { PromotionManager } from "@/components/PromotionManager";
import { NewArrivalsManager } from "@/components/NewArrivalsManager";
import { PushBroadcastManager } from "@/components/admin/PushBroadcastManager";
import { HomeSlideManager } from "@/components/admin/HomeSlideManager";

const TABS = ["banners", "slides", "inline", "promotions", "newArrivals", "push"] as const;
type Tab = (typeof TABS)[number];

function PromoContent() {
  const t = useTranslations("adminPromo");
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab: Tab = TABS.find((x) => x === initialTabParam) ?? "banners";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        <Chip label={t("tabs.banners")} active={tab === "banners"} onClick={() => setTab("banners")} />
        <Chip label={t("tabs.slides")} active={tab === "slides"} onClick={() => setTab("slides")} />
        <Chip label={t("tabs.inline")} active={tab === "inline"} onClick={() => setTab("inline")} />
        <Chip label={t("tabs.promotions")} active={tab === "promotions"} onClick={() => setTab("promotions")} />
        <Chip label={t("tabs.newArrivals")} active={tab === "newArrivals"} onClick={() => setTab("newArrivals")} />
        <Chip label={t("tabs.push")} active={tab === "push"} onClick={() => setTab("push")} />
      </div>
      {tab === "banners" ? (
        <BannerManager />
      ) : tab === "slides" ? (
        <HomeSlideManager key="hero" placement="hero" />
      ) : tab === "inline" ? (
        <HomeSlideManager key="inline" placement="inline" />
      ) : tab === "promotions" ? (
        <PromotionManager />
      ) : tab === "newArrivals" ? (
        <NewArrivalsManager />
      ) : (
        <PushBroadcastManager />
      )}
    </AdminPage>
  );
}

export default function AdminPromoPage() {
  return (
    <Suspense fallback={null}>
      <PromoContent />
    </Suspense>
  );
}
