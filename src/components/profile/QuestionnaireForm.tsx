"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SKIN_TYPES, SKIN_CONCERNS, type SkinType, type SkinConcern } from "@/lib/skincare";
import { HAIR_TYPES, HAIR_CONCERNS, type HairType, type HairConcern } from "@/lib/haircare";
import type { Session } from "@/lib/session-context";

const GENDERS = [
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
] as const;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
    "w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium mb-3">О вас</h3>
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
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip key={g.value} label={g.label} active={gender === g.value} onClick={() => setGender(gender === g.value ? null : g.value)} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Кожа лица</h3>
        <p className="text-xs text-muted mb-3">Какой у вас тип кожи?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SKIN_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} active={skinType === t.value} onClick={() => setSkinType(skinType === t.value ? null : t.value)} />
          ))}
        </div>
        <p className="text-xs text-muted mb-3">Что беспокоит? Можно выбрать несколько.</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((c) => (
            <Chip key={c.value} label={c.label} active={skinConcerns.includes(c.value)} onClick={() => setSkinConcerns(toggle(skinConcerns, c.value))} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Волосы</h3>
        <p className="text-xs text-muted mb-3">Какие у вас волосы?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {HAIR_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} active={hairType === t.value} onClick={() => setHairType(hairType === t.value ? null : t.value)} />
          ))}
        </div>
        <p className="text-xs text-muted mb-3">Что беспокоит? Можно выбрать несколько.</p>
        <div className="flex flex-wrap gap-2">
          {HAIR_CONCERNS.map((c) => (
            <Chip key={c.value} label={c.label} active={hairConcerns.includes(c.value)} onClick={() => setHairConcerns(toggle(hairConcerns, c.value))} />
          ))}
        </div>
      </div>

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
