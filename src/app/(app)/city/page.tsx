"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/types";
import { getStoredCity, setStoredCity } from "@/lib/city";

export default function CityPage() {
  const router = useRouter();
  const [cities, setCities] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(() => getStoredCity());
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

  function handleSelect(city: string) {
    setStoredCity(city);
    setSelected(city);
    router.push("/branches");
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">Мой город</h1>
      <p className="text-muted mb-8">Выберите город — так проще найти ближайшие магазины.</p>

      {loading ? (
        <p className="text-muted animate-pulse">Загружаем…</p>
      ) : cities.length === 0 ? (
        <p className="text-muted">Города пока не указаны.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => handleSelect(city)}
              className={`text-left rounded-2xl border p-5 transition ${
                selected === city
                  ? "border-accent bg-accent-soft"
                  : "border-black/5 bg-card hover:border-accent/40"
              }`}
            >
              <span className="font-display text-lg">{city}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
