"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Branch } from "@/types";
import { getStoredCity } from "@/lib/city";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [city] = useState<string | null>(() => getStoredCity());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = city ? branches.filter((b) => b.city === city) : branches;

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Магазины</h1>
      <p className="text-muted mb-8">
        {city ? `Филиалы в городе ${city}.` : "Все филиалы."}{" "}
        <Link href="/city" className="text-accent underline">
          Изменить город
        </Link>
      </p>

      {loading ? (
        <p className="text-muted animate-pulse">Загружаем…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">В этом городе пока нет филиалов.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((branch) => (
            <div key={branch.id} className="bg-card rounded-2xl border border-black/5 p-5">
              <h2 className="font-display text-xl mb-2">{branch.name}</h2>
              <p className="text-sm text-muted mb-1">{branch.address}</p>
              <p className="text-sm text-muted mb-1">{branch.phone}</p>
              <p className="text-sm text-muted mb-4">{branch.hours}</p>
              <a
                href={buildWhatsAppUrl(branch.whatsapp, `Здравствуйте! Пишу по поводу филиала «${branch.name}».`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95"
              >
                Написать в WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
