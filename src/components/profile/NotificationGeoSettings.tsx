"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Settings, ChevronDown, Bell, MapPin } from "lucide-react";
import {
  isNotifOn,
  isGeoOn,
  notifBlockedByBrowser,
  requestNotifPermission,
  dismissNotif,
  requestGeoPermission,
  dismissGeo,
} from "@/lib/permissions";

function Switch({ checked, disabled, label, onClick }: { checked: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative w-11 h-6 rounded-full shrink-0 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        disabled ? "bg-border cursor-not-allowed" : checked ? "bg-accent" : "bg-border",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={["absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0"].join(
          " "
        )}
      />
    </button>
  );
}

/**
 * Ручное вкл/выкл уведомлений и геолокации в профиле — по просьбе владельца (24.09): раньше
 * это спрашивалось только всплывающим окном при первом запуске (FirstRunFlow.tsx), и если
 * пропустить или потом передумать, включить обратно было негде. Общая логика/ключи хранения —
 * в lib/permissions.ts, тот же источник, что и у FirstRunFlow.
 */
export function NotificationGeoSettings() {
  const t = useTranslations("profile.permissions");
  const [open, setOpen] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const [geoOn, setGeoOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  useEffect(() => {
    // Notification/localStorage недоступны при рендере/SSR — читаем после монтирования.
    Promise.resolve().then(() => {
      setNotifOn(isNotifOn());
      setNotifBlocked(notifBlockedByBrowser());
      setGeoOn(isGeoOn());
    });
  }, []);

  async function toggleNotif() {
    if (notifBlocked || notifBusy) return;
    setNotifBusy(true);
    try {
      if (notifOn) {
        dismissNotif();
        setNotifOn(false);
      } else {
        const result = await requestNotifPermission();
        setNotifOn(result === "granted" || result === "granted-ui");
        setNotifBlocked(notifBlockedByBrowser());
      }
    } finally {
      setNotifBusy(false);
    }
  }

  async function toggleGeo() {
    if (geoBusy) return;
    setGeoBusy(true);
    try {
      if (geoOn) {
        dismissGeo();
        setGeoOn(false);
      } else {
        const result = await requestGeoPermission();
        setGeoOn(result === "granted");
      }
    } finally {
      setGeoBusy(false);
    }
  }

  return (
    <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition hover:bg-black/[0.02]"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
          <Settings className="size-4.5" strokeWidth={1.85} aria-hidden />
        </span>
        <span className="flex-1 text-sm font-medium">{t("title")}</span>
        <ChevronDown className={["size-4 text-muted transition-transform", open ? "rotate-180" : ""].join(" ")} strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4 border-t border-border">
          <div className="flex items-center gap-3.5 pt-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
              <Bell className="size-4.5" strokeWidth={1.85} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t("notifLabel")}</div>
              <div className="text-xs text-muted mt-0.5">
                {notifBlocked ? t("notifBlockedHint") : notifOn ? t("notifOnHint") : t("notifOffHint")}
              </div>
            </div>
            <Switch checked={notifOn} disabled={notifBlocked || notifBusy} label={t("notifLabel")} onClick={toggleNotif} />
          </div>

          <div className="flex items-center gap-3.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
              <MapPin className="size-4.5" strokeWidth={1.85} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t("geoLabel")}</div>
              <div className="text-xs text-muted mt-0.5">{geoOn ? t("geoOnHint") : t("geoOffHint")}</div>
            </div>
            <Switch checked={geoOn} disabled={geoBusy} label={t("geoLabel")} onClick={toggleGeo} />
          </div>
        </div>
      )}
    </div>
  );
}
