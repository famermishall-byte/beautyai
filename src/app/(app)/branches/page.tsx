"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Clock, MessageCircle, ChevronRight, Store } from "lucide-react";
import type { Branch } from "@/types";
import { getStoredCity } from "@/lib/city";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  // Starts null on both server and the first client render — see the same
  // rationale in page.tsx (home): reading localStorage in useState's
  // initializer would mismatch server/client output here, since this text
  // renders unconditionally rather than behind a loading gate.
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => setCity(getStoredCity()));
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = city ? branches.filter((b) => b.city === city) : branches;

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1.5">Магазины</h1>
      <div className="flex items-center gap-1.5 text-sm text-muted mb-6">
        <MapPin className="size-4" strokeWidth={2} aria-hidden />
        <span>{city ? `Филиалы в городе ${city}` : "Все филиалы"}</span>
        <Link href="/city" className="text-accent font-medium hover:underline ml-0.5">
          Изменить
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Store}
          title="В этом городе пока нет магазинов"
          description="Попробуйте выбрать другой город."
          action={
            <Link href="/city">
              <Button variant="secondary">Выбрать город</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {shown.map((branch, i) => (
            <div
              key={branch.id}
              className="animate-rise-in bg-card rounded-[var(--radius-card)] border border-border p-5 shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent shrink-0">
                    <Store className="size-5" strokeWidth={1.85} aria-hidden />
                  </span>
                  <h2 className="font-display text-lg leading-tight">{branch.name}</h2>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-soft rounded-full px-2.5 py-1 shrink-0">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  Открыто
                </span>
              </div>

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

              <a
                href={buildWhatsAppUrl(branch.whatsapp, `Здравствуйте! Пишу по поводу филиала «${branch.name}».`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:bg-accent-strong active:scale-95"
              >
                <MessageCircle className="size-4" strokeWidth={2} aria-hidden />
                Написать в WhatsApp
                <ChevronRight className="size-3.5 -ml-0.5" strokeWidth={2.25} aria-hidden />
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
