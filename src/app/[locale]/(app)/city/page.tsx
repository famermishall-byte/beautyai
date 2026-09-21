"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Check } from "lucide-react";
import type { Branch } from "@/types";
import { getStoredCity, setStoredCity } from "@/lib/city";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRouter } from "@/i18n/navigation";

export default function CityPage() {
  const router = useRouter();
  const [cities, setCities] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(() => getStoredCity());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => {
        const unique = [...new Set((data.branches ?? []).map((b) => b.city).filter(Boolean))];
        setCities(unique);
        if (!getStoredCity() && unique.length === 1) {
          setStoredCity(unique[0]);
          setSelected(unique[0]);
        }
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => cities.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase())),
    [cities, query]
  );

  function handleSelect(city: string) {
    setStoredCity(city);
    setSelected(city);
    router.push("/branches");
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1.5">Выберите город</h1>
      <p className="text-muted text-sm mb-6">Покажем ближайшие магазины и актуальный каталог.</p>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти город"
          className="w-full rounded-[var(--radius-control)] border border-border bg-card pl-11 pr-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent shadow-[var(--shadow-card)]"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : cities.length === 0 ? (
        <EmptyState icon={MapPin} title="Города пока не указаны" description="Магазин ещё не добавил ни одного города." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Ничего не нашлось" description={`Нет города по запросу «${query}».`} />
      ) : (
        <>
          {selected && !query && (
            <div className="mb-5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted mb-2.5 px-1">Ваш город</div>
              <CityRow city={selected} active onSelect={handleSelect} />
            </div>
          )}

          <div className="text-xs font-medium uppercase tracking-wide text-muted mb-2.5 px-1">
            {query ? "Результаты поиска" : "Все города"}
          </div>
          <div className="flex flex-col gap-2.5">
            {filtered
              .filter((c) => query || c !== selected)
              .map((city) => (
                <CityRow key={city} city={city} active={city === selected} onSelect={handleSelect} />
              ))}
          </div>
        </>
      )}
    </main>
  );
}

function CityRow({ city, active, onSelect }: { city: string; active: boolean; onSelect: (city: string) => void }) {
  return (
    <button
      onClick={() => onSelect(city)}
      className={[
        "w-full flex items-center gap-3.5 rounded-[var(--radius-card)] px-5 py-4 text-left transition-all duration-150",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-accent text-white shadow-[var(--shadow-float)]"
          : "bg-card border border-border hover:border-accent/40 hover:shadow-[var(--shadow-card)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
          active ? "bg-white/20" : "bg-accent-soft text-accent",
        ].join(" ")}
      >
        <MapPin className="size-4.5" strokeWidth={2} aria-hidden />
      </span>
      <span className="font-display text-lg flex-1">{city}</span>
      {active && <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
