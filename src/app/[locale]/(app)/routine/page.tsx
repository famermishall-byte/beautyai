"use client";

import { useSession } from "@/lib/session-context";
import { buildRoutine, skinTypeLabel, skinConcernLabel, type SkinType, type SkinConcern } from "@/lib/skincare";
import { Link } from "@/i18n/navigation";

function RoutineList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="bg-card rounded-2xl border border-black/5 p-5">
      <h2 className="font-medium mb-3">{title}</h2>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="w-6 h-6 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-medium">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function RoutinePage() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="text-muted animate-pulse">Загружаем…</p>
      </main>
    );
  }

  const skinType = (session?.skinType as SkinType | null) ?? null;

  if (!skinType) {
    return (
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full text-center">
        <div className="text-4xl mb-3">🧴</div>
        <h1 className="font-display text-2xl mb-2">Сначала укажите тип кожи</h1>
        <p className="text-muted mb-6">Чтобы подобрать порядок ухода, расскажите нам о своей коже.</p>
        <Link
          href="/skin-profile"
          className="inline-block rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90"
        >
          Настроить
        </Link>
      </main>
    );
  }

  const concerns = (session?.skinConcerns as SkinConcern[]) ?? [];
  const routine = buildRoutine(skinType, concerns);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Мой уход</h1>
      <p className="text-muted mb-6">
        Для типа кожи «{skinTypeLabel(skinType)}»
        {concerns.length > 0 && <> · {concerns.map(skinConcernLabel).join(", ")}</>}
      </p>

      <div className="flex flex-col gap-4 mb-6">
        <RoutineList title="Утро" steps={routine.morning} />
        <RoutineList title="Вечер" steps={routine.evening} />
      </div>

      {routine.tips.length > 0 && (
        <div className="bg-accent-soft text-accent rounded-2xl p-5">
          <h2 className="font-medium mb-2">Советы</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {routine.tips.map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/skin-profile" className="inline-block mt-6 text-sm text-accent underline">
        Изменить тип кожи или проблемы
      </Link>
    </main>
  );
}
