"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Contrast, Droplet, Flower2, Leaf, Mars, Scissors, Sparkles, Sun, UserRound, Venus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SKIN_TYPES, SKIN_CONCERNS, type SkinType, type SkinConcern } from "@/lib/skincare";
import { HAIR_TYPES, HAIR_CONCERNS, type HairType, type HairConcern } from "@/lib/haircare";
import type { Session } from "@/lib/session-context";

const GENDERS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "female", label: "Женский", icon: Venus },
  { value: "male", label: "Мужской", icon: Mars },
];

const SKIN_ICONS: Record<SkinType, LucideIcon> = {
  dry: Sun,
  oily: Droplet,
  combination: Contrast,
  normal: Leaf,
  sensitive: Flower2,
};

const HAIR_ICONS: Record<HairType, LucideIcon> = {
  dry: Sun,
  oily: Droplet,
  normal: Leaf,
  combination: Contrast,
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function SectionHead({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="grid place-items-center size-10 shrink-0 rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <h3 className="font-display text-lg leading-tight">{title}</h3>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function Tile({ label, icon: Icon, active, onClick }: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "relative flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] px-2 py-4 text-center text-sm font-semibold leading-tight",
        "transition duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        active ? "bg-accent text-white shadow-[var(--shadow-float)]" : "bg-background text-foreground hover:bg-accent-soft",
      ].join(" ")}
    >
      <Icon className={`size-6 ${active ? "" : "text-accent"}`} strokeWidth={1.6} aria-hidden />
      <span>{label}</span>
      {active && (
        <span className="absolute top-1.5 right-1.5 grid place-items-center size-4 rounded-full bg-white text-accent animate-pop">
          <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
        </span>
      )}
    </button>
  );
}

function ConcernChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition duration-200 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        active ? "border-accent bg-accent text-white" : "border-border-strong bg-transparent text-foreground hover:border-accent hover:text-accent",
      ].join(" ")}
    >
      {active && <Check className="size-3.5 animate-pop" strokeWidth={3} aria-hidden />}
      {label}
    </button>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium mt-6 mb-3">{children}</p>;
}

export function QuestionnaireForm({
  session,
  onSaved,
  onCancel,
}: {
  session: Session;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(session.displayName ?? "");
  const [birthDate, setBirthDate] = useState(session.birthDate ?? "");
  const [gender, setGender] = useState<string | null>(session.gender);
  const [skinType, setSkinType] = useState<SkinType | null>((session.skinType as SkinType) ?? null);
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>((session.skinConcerns as SkinConcern[]) ?? []);
  const [hairType, setHairType] = useState<HairType | null>((session.hairType as HairType) ?? null);
  const [hairConcerns, setHairConcerns] = useState<HairConcern[]>((session.hairConcerns as HairConcern[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          birthDate: birthDate || null,
          gender,
          skinType,
          skinConcerns,
          hairType,
          hairConcerns,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось сохранить.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-[var(--radius-control)] border border-transparent bg-background px-4 py-3.5 text-sm outline-none transition focus:bg-card focus:ring-2 focus:ring-accent focus:border-accent placeholder:text-muted";

  const answers = [name.trim(), birthDate, gender, skinType, hairType];
  const done = answers.filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9">
      <div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted mb-2">
          <span>{done === answers.length ? "Всё заполнено — осталось сохранить" : "Чем больше расскажете, тем точнее набор"}</span>
          <span className="font-semibold text-accent tabular-nums">
            {done}/{answers.length}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full bg-accent-soft overflow-hidden"
          role="progressbar"
          aria-label="Заполнено вопросов анкеты"
          aria-valuemin={0}
          aria-valuemax={answers.length}
          aria-valuenow={done}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${(done / answers.length) * 100}%` }}
          />
        </div>
      </div>

      <section>
        <SectionHead icon={UserRound} title="О вас" />
        <div className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут?" className={inputClass} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Дата рождения</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {GENDERS.map((g) => (
              <Tile key={g.value} label={g.label} icon={g.icon} active={gender === g.value} onClick={() => setGender(gender === g.value ? null : g.value)} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHead icon={Sparkles} title="Кожа лица" hint="Какой у вас тип кожи?" />
        <div className="grid grid-cols-3 gap-3">
          {SKIN_TYPES.map((t) => (
            <Tile key={t.value} label={t.label} icon={SKIN_ICONS[t.value]} active={skinType === t.value} onClick={() => setSkinType(skinType === t.value ? null : t.value)} />
          ))}
        </div>
        <SubLabel>Что беспокоит? Можно выбрать несколько.</SubLabel>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((c) => (
            <ConcernChip key={c.value} label={c.label} active={skinConcerns.includes(c.value)} onClick={() => setSkinConcerns(toggle(skinConcerns, c.value))} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead icon={Scissors} title="Волосы" hint="Какие у вас волосы?" />
        <div className="grid grid-cols-2 gap-3">
          {HAIR_TYPES.map((t) => (
            <Tile key={t.value} label={t.label} icon={HAIR_ICONS[t.value]} active={hairType === t.value} onClick={() => setHairType(hairType === t.value ? null : t.value)} />
          ))}
        </div>
        <SubLabel>Что беспокоит? Можно выбрать несколько.</SubLabel>
        <div className="flex flex-wrap gap-2">
          {HAIR_CONCERNS.map((c) => (
            <ConcernChip key={c.value} label={c.label} active={hairConcerns.includes(c.value)} onClick={() => setHairConcerns(toggle(hairConcerns, c.value))} />
          ))}
        </div>
      </section>

      {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="lg" fullWidth loading={saving}>
          Сохранить и подобрать набор
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}
