"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Phone, Clock, MessageCircle, Navigation, Store } from "lucide-react";
import type { Branch } from "@/types";
import { getStoredCity } from "@/lib/city";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { BranchMap } from "@/components/BranchMap";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";

import { buttonClasses } from "@/components/ui/Button";
type Coords = { latitude: number; longitude: number };

function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function formatDistance(t: (key: string, values: Record<string, string | number>) => string, km: number): string {
  return km < 1 ? t("meters", { n: Math.round(km * 1000) }) : t("kilometers", { n: km.toFixed(1) });
}

export default function BranchesPage() {
  const t = useTranslations("branches");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [user, setUser] = useState<Coords | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read after mount (SSR has no localStorage) — see the same rationale in page.tsx (home).
    Promise.resolve().then(() => {
      setCity(getStoredCity());
      try {
        const raw = localStorage.getItem("beautyai-coords");
        if (raw) {
          const c = JSON.parse(raw) as Coords;
          if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) setUser(c);
        }
      } catch {
        // нет сохранённого местоположения — расстояния просто не показываем
      }
    });
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  // Nearest first when we know where the person is, otherwise their chosen city's branches first.
  const ordered = useMemo(() => {
    const withDistance = branches.map((b) => ({
      branch: b,
      km: user && b.latitude !== null && b.longitude !== null ? distanceKm(user, { latitude: b.latitude, longitude: b.longitude }) : null,
    }));
    return withDistance.sort((a, b) => {
      if (a.km !== null && b.km !== null) return a.km - b.km;
      if (a.km !== null) return -1;
      if (b.km !== null) return 1;
      return Number(b.branch.city === city) - Number(a.branch.city === city);
    });
  }, [branches, user, city]);

  function selectBranch(id: string) {
    setSelectedId(id);
    document.getElementById("branch-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1.5">{t("title")}</h1>
      <div className="flex items-center gap-1.5 text-sm text-muted mb-5">
        <MapPin className="size-4" strokeWidth={2} aria-hidden />
        <span>{city ? t("yourCity", { city }) : t("allBranches")}</span>
        <Link href="/city" className="text-accent font-medium hover:underline ml-0.5">
          {t("change")}
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState icon={Store} title={t("none")} description={t("noneHint")} />
      ) : (
        <>
          <div id="branch-map" className="mb-5 scroll-mt-20">
            <BranchMap branches={branches} selectedId={selectedId} onSelect={setSelectedId} userPosition={user} />
          </div>

          <div className="flex flex-col gap-3.5">
            {ordered.map(({ branch, km }, i) => {
              const hasPoint = branch.latitude !== null && branch.longitude !== null;
              const active = branch.id === selectedId;
              return (
                <div
                  key={branch.id}
                  className={[
                    "animate-rise-in bg-card rounded-card border p-5 shadow-card transition-colors",
                    active ? "border-accent" : "border-border",
                  ].join(" ")}
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <button
                    onClick={() => hasPoint && selectBranch(branch.id)}
                    disabled={!hasPoint}
                    className="w-full flex items-start justify-between gap-3 mb-3.5 text-left disabled:cursor-default focus-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent shrink-0">
                        <Store className="size-5" strokeWidth={1.85} aria-hidden />
                      </span>
                      <div>
                        <h2 className="font-display text-lg leading-tight">{branch.name}</h2>
                        {km !== null && <div className="text-xs text-accent font-medium mt-0.5">{t("fromYou", { distance: formatDistance(t, km) })}</div>}
                      </div>
                    </div>
                    {hasPoint && <span className="text-xs text-accent font-medium shrink-0 mt-1">{t("onMap")}</span>}
                  </button>

                  <div className="flex flex-col gap-2 text-sm text-muted mb-4 pl-[3.25rem]">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {branch.address}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {branch.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {branch.hours}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildWhatsAppUrl(branch.whatsapp, `Здравствуйте! Пишу по поводу филиала «${branch.name}».`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ size: "sm" })}
                    >
                      <MessageCircle className="size-4" strokeWidth={2} aria-hidden />
                      WhatsApp
                    </a>
                    {hasPoint && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses({ variant: "secondary", size: "sm" })}
                      >
                        <Navigation className="size-4" strokeWidth={2} aria-hidden />
                        {t("route")}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
