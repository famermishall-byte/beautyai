"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { dismissNotif, isNotifOn, notifBlockedByBrowser, requestNotifPermission } from "@/lib/permissions";
import { pushSupported } from "@/lib/push";

/**
 * «Уведомления о новых заказах» наверху «Заказов» в админке: сотрудники в клиентский профиль не заходят, поэтому
 * включают push здесь (docs/superpowers/specs/2026-09-29-web-push-design.md).
 */
export function StaffPushCard() {
  const t = useTranslations("staffPush");
  const [state, setState] = useState<"loading" | "on" | "off" | "blocked" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Notification/localStorage доступны только после монтирования.
    Promise.resolve().then(() =>
      setState(!pushSupported() ? "unsupported" : notifBlockedByBrowser() ? "blocked" : isNotifOn() ? "on" : "off")
    );
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      const result = await requestNotifPermission();
      setState(result === "granted" ? "on" : notifBlockedByBrowser() ? "blocked" : "off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "on") {
    return (
      <div className="rounded-[var(--radius-card)] bg-success-soft text-success px-4 py-3 mb-4 flex items-center gap-3 text-sm">
        <Bell className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="flex-1 font-medium">{t("on")}</span>
        <button
          type="button"
          onClick={() => {
            dismissNotif();
            setState("off");
          }}
          className="text-xs underline underline-offset-2 min-h-11 px-1"
        >
          {t("turnOff")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent-soft px-4 py-3 mb-4 flex flex-col gap-2 text-sm">
      <div className="flex items-start gap-3">
        <BellOff className="size-4.5 shrink-0 mt-0.5 text-accent" strokeWidth={2} aria-hidden />
        <div className="flex-1">
          <div className="font-semibold">{t("title")}</div>
          <div className="text-xs text-muted mt-0.5 leading-snug">
            {state === "unsupported" ? t("unsupported") : state === "blocked" ? t("blocked") : t("hint")}
          </div>
        </div>
      </div>
      {state === "off" && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="self-start rounded-full bg-accent text-white px-4 min-h-11 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
        >
          {t("turnOn")}
        </button>
      )}
    </div>
  );
}
