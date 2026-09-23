"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Tag, Package, Sparkles, MapPin, Store, Navigation } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { consumeJustRegistered } from "@/lib/session-flags";
import {
  readPermissionFlag as read,
  writePermissionFlag as write,
  notifDecided,
  geoDecided,
  requestNotifPermission,
  dismissNotif,
  requestGeoPermission,
  dismissGeo,
} from "@/lib/permissions";
import { PermissionScreen } from "@/components/PermissionScreen";
import { LogoIntro } from "@/components/LogoIntro";

const INTRO_KEY = "beautyai-intro-seen";

type Step = "notif" | "geo" | "intro" | null;

function introSeen(): boolean {
  return read(INTRO_KEY) !== null;
}

function stepAfterGeo(): Step {
  return introSeen() ? null : "intro";
}

export function FirstRunFlow() {
  const t = useTranslations("firstRun");
  const tMeta = useTranslations("meta");
  const { session, loading, isAdmin } = useSession();
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !session || isAdmin) return;
    // Starts hidden on server and first client render, then decides after
    // mount (localStorage/Notification don't exist during SSR). Deferred via
    // a resolved microtask — same pattern as NavHeader.tsx.
    Promise.resolve().then(() => {
      // Раньше это всплывало при КАЖДОМ входе, пока уведомления/геолокация не были решены —
      // включая обычный логин уже существующего аккаунта и переход владельца/менеджера из
      // админки в витрину (там isAdmin=false, см. session-context.tsx). Теперь — ровно один
      // раз, сразу после регистрации (флаг ставит login/page.tsx). Повторно включить/выключить
      // уведомления и геолокацию позже можно в /profile — NotificationGeoSettings.tsx.
      if (!consumeJustRegistered()) return;
      setStep(!notifDecided() ? "notif" : !geoDecided() ? "geo" : stepAfterGeo());
    });
  }, [loading, session, isAdmin]);

  function nextAfterNotif() {
    setStep(geoDecided() ? stepAfterGeo() : "geo");
  }

  async function allowNotifications() {
    setBusy(true);
    try {
      await requestNotifPermission();
    } finally {
      setBusy(false);
      nextAfterNotif();
    }
  }

  function skipNotifications() {
    dismissNotif();
    nextAfterNotif();
  }

  async function allowGeolocation() {
    setBusy(true);
    try {
      await requestGeoPermission();
    } finally {
      setBusy(false);
      setStep(stepAfterGeo());
    }
  }

  function skipGeolocation() {
    dismissGeo();
    setStep(stepAfterGeo());
  }

  if (step === "notif") {
    return (
      <PermissionScreen
        icon={Bell}
        title={t("notif.title")}
        description={t("notif.description")}
        perks={[
          { icon: Package, text: t("notif.perkOrder") },
          { icon: Sparkles, text: t("notif.perkNew") },
          { icon: Tag, text: t("notif.perkPromo") },
        ]}
        allowLabel={t("notif.allow")}
        busy={busy}
        onAllow={allowNotifications}
        onSkip={skipNotifications}
      />
    );
  }

  if (step === "geo") {
    return (
      <PermissionScreen
        icon={MapPin}
        title={t("geo.title")}
        description={t("geo.description")}
        perks={[
          { icon: Navigation, text: t("geo.perkCity") },
          { icon: Store, text: t("geo.perkStores") },
        ]}
        allowLabel={t("geo.allow")}
        busy={busy}
        onAllow={allowGeolocation}
        onSkip={skipGeolocation}
      />
    );
  }

  if (step === "intro") {
    return (
      <LogoIntro
        storeName={session?.storeName || tMeta("title")}
        onDone={() => {
          write(INTRO_KEY, "1");
          setStep(null);
        }}
      />
    );
  }

  return null;
}
