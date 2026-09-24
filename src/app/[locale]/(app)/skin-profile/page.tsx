"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, type Session } from "@/lib/session-context";
import { SKIN_TYPES, SKIN_CONCERNS, type SkinType, type SkinConcern } from "@/lib/skincare";
import { useRouter } from "@/i18n/navigation";
import { ChevronRight, Droplets } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SkinProfilePage() {
  const t = useTranslations("skinProfile");
  const tSkin = useTranslations("skin");
  const { session, loading, refresh } = useSession();
  const router = useRouter();

  const [skinType, setSkinType] = useState<SkinType | null>(() => (session?.skinType as SkinType) ?? null);
  const [concerns, setConcerns] = useState<SkinConcern[]>(() => (session?.skinConcerns as SkinConcern[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync the selected type/concerns whenever `session` is (re)loaded (e.g.
  // after `refresh()`), same "adjust state during render" replacement for a
  // useEffect as in profile/page.tsx.
  const [prevSessionForSkin, setPrevSessionForSkin] = useState<Session | null>(session);
  if (session !== prevSessionForSkin) {
    setPrevSessionForSkin(session);
    if (session) {
      setSkinType((session.skinType as SkinType) ?? null);
      setConcerns((session.skinConcerns as SkinConcern[]) ?? []);
    }
  }

  function toggleConcern(value: SkinConcern) {
    setConcerns((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinType, skinConcerns: concerns }),
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <Skeleton className="h-36 w-full rounded-card mb-4" />
        <Skeleton className="h-52 w-full rounded-card" />
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <PageHeader icon={Droplets} title={t("title")} subtitle={t("subtitle")} />

      <section className="surface-card p-5 mb-4">
        <h2 className="font-display text-lg mb-3">{t("skinType")}</h2>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((s) => (
            <Chip
              key={s.value}
              label={tSkin(`types.${s.value}`)}
              active={skinType === s.value}
              onClick={() => {
                setSkinType(s.value);
                setSaved(false);
              }}
            />
          ))}
        </div>
      </section>

      <section className="surface-card p-5 mb-6">
        <h2 className="font-display text-lg mb-3">{t("concerns")}</h2>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((c) => (
            <Chip
              key={c.value}
              label={tSkin(`concerns.${c.value}`)}
              active={concerns.includes(c.value)}
              onClick={() => toggleConcern(c.value)}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={handleSave} loading={saving} disabled={!skinType} className="sm:flex-1">
          {saving ? t("saving") : saved ? t("saved") : t("save")}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => router.push("/routine")} className="sm:flex-1">
          {t("viewRoutine")}
          <ChevronRight className="size-4.5" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </main>
  );
}
