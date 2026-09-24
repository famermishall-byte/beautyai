"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, type Session } from "@/lib/session-context";
import { SKIN_TYPES, SKIN_CONCERNS, type SkinType, type SkinConcern } from "@/lib/skincare";
import { useRouter } from "@/i18n/navigation";

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
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="text-muted animate-pulse">{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">{t("title")}</h1>
      <p className="text-muted mb-8">{t("subtitle")}</p>

      <section className="mb-8">
        <h2 className="font-medium mb-3">{t("skinType")}</h2>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setSkinType(s.value);
                setSaved(false);
              }}
              className={[
                "rounded-full px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                skinType === s.value
                  ? "bg-accent text-on-accent"
                  : "bg-accent-soft text-accent hover:bg-accent hover:text-on-accent",
              ].join(" ")}
            >
              {tSkin(`types.${s.value}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-medium mb-3">{t("concerns")}</h2>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((c) => {
            const active = concerns.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => toggleConcern(c.value)}
                aria-pressed={active}
                className={[
                  "rounded-full px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "bg-accent text-on-accent"
                    : "bg-accent-soft text-accent hover:bg-accent hover:text-on-accent",
                ].join(" ")}
              >
                {tSkin(`concerns.${c.value}`)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !skinType}
          className="rounded-full bg-accent text-on-accent px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {saving ? t("saving") : saved ? t("saved") : t("save")}
        </button>
        <button
          onClick={() => router.push("/routine")}
          className="text-sm text-accent underline"
        >
          {t("viewRoutine")}
        </button>
      </div>
    </main>
  );
}
