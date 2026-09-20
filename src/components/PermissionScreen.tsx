"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type Perk = { icon: LucideIcon; text: string };

export function PermissionScreen({
  icon: Icon,
  title,
  description,
  perks,
  allowLabel,
  skipLabel = "Не сейчас",
  busy,
  onAllow,
  onSkip,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  perks: Perk[];
  allowLabel: string;
  skipLabel?: string;
  busy: boolean;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-background flex flex-col items-center px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-title"
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center-safe text-center max-w-sm w-full animate-rise-in">
        <div className="relative mb-6 shrink-0">
          <div className="w-32 h-32 rounded-full bg-accent-soft flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center shadow-[var(--shadow-float)]">
              <Icon className="size-9" strokeWidth={1.75} aria-hidden />
            </div>
          </div>
          <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-accent-strong ring-4 ring-background" aria-hidden />
        </div>

        <h1 id="permission-title" className="font-display text-3xl leading-tight mb-3">
          {title}
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8">{description}</p>

        <ul className="flex flex-col gap-3 w-full text-left">
          {perks.map(({ icon: PerkIcon, text }) => (
            <li key={text} className="flex items-center gap-3.5 bg-card border border-border rounded-[var(--radius-card)] px-4 py-3.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
                <PerkIcon className="size-4.5" strokeWidth={1.85} aria-hidden />
              </span>
              <span className="text-sm font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2 pt-4 shrink-0">
        <Button size="lg" fullWidth loading={busy} onClick={onAllow}>
          {allowLabel}
        </Button>
        <Button variant="ghost" size="lg" fullWidth disabled={busy} onClick={onSkip} className="border-transparent">
          {skipLabel}
        </Button>
      </div>
    </div>
  );
}
