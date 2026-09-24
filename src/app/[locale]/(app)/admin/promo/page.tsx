"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Chip } from "@/components/ui/Chip";
import { BannerManager } from "@/components/BannerManager";
import { PromotionManager } from "@/components/PromotionManager";
import { NewArrivalsManager } from "@/components/NewArrivalsManager";

type Tab = "banners" | "promotions" | "newArrivals";

function PromoContent() {
  const t = useTranslations("adminPromo");
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab: Tab = initialTabParam === "promotions" ? "promotions" : initialTabParam === "newArrivals" ? "newArrivals" : "banners";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <div className="flex gap-2 mb-5">
        <Chip label={t("tabs.banners")} active={tab === "banners"} onClick={() => setTab("banners")} />
        <Chip label={t("tabs.promotions")} active={tab === "promotions"} onClick={() => setTab("promotions")} />
        <Chip label={t("tabs.newArrivals")} active={tab === "newArrivals"} onClick={() => setTab("newArrivals")} />
      </div>
      {tab === "banners" ? <BannerManager /> : tab === "promotions" ? <PromotionManager /> : <NewArrivalsManager />}
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
