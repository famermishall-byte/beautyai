import { CalendarHeart, Scissors, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { skinTypeLabel, skinConcernLabel } from "@/lib/skincare";
import { hairTypeLabel, hairConcernLabel } from "@/lib/haircare";
import { ageFromBirthDate, formatBirthDate, yearsLabel } from "@/lib/birthdate";

const GENDER_LABELS: Record<string, string> = { female: "Женский", male: "Мужской" };

function Row({
  icon: Icon,
  label,
  value,
  concerns,
  concernsLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  concerns?: string[];
  concernsLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
      <span className="grid place-items-center size-10 shrink-0 rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={value ? "font-display text-lg leading-snug" : "text-sm text-muted mt-0.5"}>{value ?? "Не указано"}</div>
        {concerns && concerns.length > 0 && (
          <div className="mt-2.5">
            {concernsLabel && <div className="text-xs text-muted mb-1.5">{concernsLabel}</div>}
            <div className="flex flex-wrap gap-1.5">
              {concerns.map((c) => (
                <span key={c} className="rounded-full bg-accent-soft text-accent-strong px-3 py-1 text-xs font-semibold">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuestionnaireSummary({
  birthDate,
  gender,
  skinType,
  skinConcerns,
  hairType,
  hairConcerns,
}: {
  birthDate: string | null;
  gender: string | null;
  skinType: string | null;
  skinConcerns: string[];
  hairType: string | null;
  hairConcerns: string[];
}) {
  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  const birthValue = birthDate ? `${formatBirthDate(birthDate)}` : null;
  const genderValue = gender ? (GENDER_LABELS[gender] ?? null) : null;

  return (
    <div className="flex flex-col divide-y divide-border">
      <Row
        icon={CalendarHeart}
        label="Дата рождения"
        value={birthValue ? (age !== null ? `${birthValue} · ${age} ${yearsLabel(age)}` : birthValue) : null}
      />
      <Row icon={UserRound} label="Пол" value={genderValue} />
      <Row
        icon={Sparkles}
        label="Кожа лица"
        value={skinTypeLabel(skinType)}
        concerns={skinConcerns.map(skinConcernLabel)}
        concernsLabel="Беспокоит"
      />
      <Row
        icon={Scissors}
        label="Волосы"
        value={hairTypeLabel(hairType)}
        concerns={hairConcerns.map(hairConcernLabel)}
        concernsLabel="Беспокоит"
      />
    </div>
  );
}
