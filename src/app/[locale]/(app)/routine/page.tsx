"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-context";
import { buildRoutine, skinTypeLabel, skinConcernLabel, type SkinType, type SkinConcern } from "@/lib/skincare";
import { Link } from "@/i18n/navigation";
import { Sun, Moon, Lightbulb, Droplets, ChevronRight, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";

// (title/steps arrive already translated)
function RoutineList({ title, steps, icon: Icon }: { title: string; steps: string[]; icon: LucideIcon }) {
  return (
    <section className="surface-card p-5">
      <h2 className="font-display text-lg flex items-center gap-2 mb-3.5">
        <Icon className="size-5 text-accent" strokeWidth={1.85} aria-hidden />
        {title}
      </h2>
      <ol className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="w-7 h-7 shrink-0 rounded-full bg-accent-soft text-accent-strong flex items-center justify-center text-xs font-semibold tabular-nums">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RoutinePage() {
  const t = useTranslations("routine");
  const tSkin = useTranslations("skin");
  const { session, loading } = useSession();

  if (loading) {
    return (
      <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-2/3 mb-6" />
        <Skeleton className="h-48 w-full rounded-card mb-4" />
        <Skeleton className="h-40 w-full rounded-card" />
      </main>
    );
  }

  const skinType = (session?.skinType as SkinType | null) ?? null;

  if (!skinType) {
    return (
      <main className="flex-1 px-4 max-w-2xl mx-auto w-full">
        <EmptyState
          icon={Droplets}
          title={t("needSkinType")}
          description={t("needSkinTypeHint")}
          action={
            <Link href="/skin-profile" className={buttonClasses({ size: "lg" })}>
              {t("setUp")}
            </Link>
          }
        />
      </main>
    );
  }

  const concerns = (session?.skinConcerns as SkinConcern[]) ?? [];
  const routine = buildRoutine(tSkin, skinType, concerns);

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <PageHeader
        icon={Droplets}
        title={t("title")}
        subtitle={
          <>
            {t("forSkinType", { type: skinTypeLabel(tSkin, skinType) ?? "" })}
            {concerns.length > 0 && <> · {concerns.map((c) => skinConcernLabel(tSkin, c)).join(", ")}</>}
          </>
        }
      />

      <div className="flex flex-col gap-4 mb-4">
        <RoutineList icon={Sun} title={t("morning")} steps={routine.morning} />
        <RoutineList icon={Moon} title={t("evening")} steps={routine.evening} />
      </div>

      {routine.tips.length > 0 && (
        <section className="bg-accent-soft text-accent-strong rounded-card p-5">
          <h2 className="font-display text-lg flex items-center gap-2 mb-2">
            <Lightbulb className="size-5" strokeWidth={1.85} aria-hidden />
            {t("tips")}
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm list-disc pl-5 marker:text-accent">
            {routine.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/skin-profile"
        className="mt-4 flex items-center justify-between gap-3 surface-card px-4 py-3.5 text-sm font-medium transition hover:border-accent/30 active:scale-[0.99] focus-ring"
      >
        {t("changeSkin")}
        <ChevronRight className="size-4.5 text-muted shrink-0" strokeWidth={2} aria-hidden />
      </Link>
    </main>
  );
}
