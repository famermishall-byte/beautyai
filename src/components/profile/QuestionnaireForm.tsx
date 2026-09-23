"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SKIN_TYPES, SKIN_CONCERNS, type SkinType, type SkinConcern } from "@/lib/skincare";
import { HAIR_TYPES, HAIR_CONCERNS, type HairType, type HairConcern } from "@/lib/haircare";
import { formatBirthDate } from "@/lib/birthdate";
import type { Session } from "@/lib/session-context";

const GENDERS = ["female", "male"] as const;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Клиент печатает подряд цифры («10041989») — сами расставляем точки по ходу ввода (ДД.ММ.ГГГГ),
// вместо родного <input type="date">, чей календарь/колёсики на телефоне неудобны для быстрого ввода.
function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join(".");
}

// Возвращает "YYYY-MM-DD" (формат хранения — см. birthdate.ts) только когда дата полная и
// календарно существует (напр. 30.02 — нет); иначе null, чтобы не отправить мусор на сервер.
function parseBirthDateInput(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > new Date(year, month, 0).getDate()) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (year < 1900 || iso > new Date().toISOString().slice(0, 10)) return null;
  return iso;
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
  const t = useTranslations("questionnaire");
  const tSkin = useTranslations("skin");
  const tHair = useTranslations("hair");
  const [name, setName] = useState(session.displayName ?? "");
  const [birthDateText, setBirthDateText] = useState(session.birthDate ? formatBirthDate(session.birthDate) : "");
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

    const birthDate = birthDateText ? parseBirthDateInput(birthDateText) : null;
    if (birthDateText && !birthDate) {
      setError(t("birthDateInvalid"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          birthDate,
          gender,
          skinType,
          skinConcerns,
          hairType,
          hairConcerns,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("saveFailed"));
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
        <h3 className="text-sm font-medium mb-3">{t("aboutYou")}</h3>
        <div className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className={inputClass} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{t("birthDate")}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder={t("birthDatePlaceholder")}
              value={birthDateText}
              onChange={(e) => setBirthDateText(formatBirthDateInput(e.target.value))}
              maxLength={10}
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip key={g} label={t(`gender.${g}`)} active={gender === g} onClick={() => setGender(gender === g ? null : g)} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">{t("face")}</h3>
        <p className="text-xs text-muted mb-3">{t("skinTypeQuestion")}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SKIN_TYPES.map((s) => (
            <Chip key={s.value} label={tSkin(`types.${s.value}`)} active={skinType === s.value} onClick={() => setSkinType(skinType === s.value ? null : s.value)} />
          ))}
        </div>
        <p className="text-xs text-muted mb-3">{t("concernsQuestion")}</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((c) => (
            <Chip key={c.value} label={tSkin(`concerns.${c.value}`)} active={skinConcerns.includes(c.value)} onClick={() => setSkinConcerns(toggle(skinConcerns, c.value))} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">{t("hair")}</h3>
        <p className="text-xs text-muted mb-3">{t("hairTypeQuestion")}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {HAIR_TYPES.map((h) => (
            <Chip key={h.value} label={tHair(`types.${h.value}`)} active={hairType === h.value} onClick={() => setHairType(hairType === h.value ? null : h.value)} />
          ))}
        </div>
        <p className="text-xs text-muted mb-3">{t("concernsQuestion")}</p>
        <div className="flex flex-wrap gap-2">
          {HAIR_CONCERNS.map((c) => (
            <Chip key={c.value} label={tHair(`concerns.${c.value}`)} active={hairConcerns.includes(c.value)} onClick={() => setHairConcerns(toggle(hairConcerns, c.value))} />
          ))}
        </div>
      </div>

      {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="lg" fullWidth loading={saving}>
          {t("submit")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
