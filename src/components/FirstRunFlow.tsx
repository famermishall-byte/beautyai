"use client";

import { useEffect, useState } from "react";
import { Bell, Tag, Package, Sparkles, MapPin, Store, Navigation } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { setStoredCity } from "@/lib/city";
import { PermissionScreen } from "@/components/PermissionScreen";
import { LogoIntro } from "@/components/LogoIntro";
import type { Branch } from "@/types";

const NOTIF_KEY = "beautyai-notif-prompt";
const GEO_KEY = "beautyai-geo-prompt";
const COORDS_KEY = "beautyai-coords";
const INTRO_KEY = "beautyai-intro-seen";

type Step = "notif" | "geo" | "intro" | null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage unavailable: treat as already answered so we never nag on every load.
    return "unavailable";
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // недоступно — окно просто покажется снова в следующий раз
  }
}

function notifDecided(): boolean {
  return read(NOTIF_KEY) !== null || (typeof Notification !== "undefined" && Notification.permission !== "default");
}

function geoDecided(): boolean {
  return read(GEO_KEY) !== null;
}

function introSeen(): boolean {
  return read(INTRO_KEY) !== null;
}

function stepAfterGeo(): Step {
  return introSeen() ? null : "intro";
}

// Best-effort: turn coordinates into a city name and, if it matches a city
// where the store has a branch, select it. Uses BigDataCloud's free
// client-side reverse-geocoding endpoint (no API key) — the coordinates are
// sent to that third-party service, and only when the user allowed location.
async function detectCity(latitude: number, longitude: number) {
  try {
    const [branchesRes, geoRes] = await Promise.all([
      fetch("/api/branches"),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ru`
      ),
    ]);
    if (!branchesRes.ok || !geoRes.ok) return;
    const { branches } = (await branchesRes.json()) as { branches: Branch[] };
    const geo = (await geoRes.json()) as { city?: string; locality?: string };
    const names = [geo.city, geo.locality].filter(Boolean).map((n) => (n as string).toLowerCase());
    const match = (branches ?? []).find((b) => b.city && names.some((n) => n.includes(b.city.toLowerCase())));
    if (match) setStoredCity(match.city);
  } catch {
    // Не получилось определить — остаётся ручной выбор города.
  }
}

function requestPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export function FirstRunFlow() {
  const { session, loading, isAdmin } = useSession();
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !session || isAdmin) return;
    // Starts hidden on server and first client render, then decides after
    // mount (localStorage/Notification don't exist during SSR). Deferred via
    // a resolved microtask — same pattern as NavHeader.tsx.
    Promise.resolve().then(() => {
      setStep(!notifDecided() ? "notif" : !geoDecided() ? "geo" : stepAfterGeo());
    });
  }, [loading, session, isAdmin]);

  function nextAfterNotif() {
    setStep(geoDecided() ? stepAfterGeo() : "geo");
  }

  async function allowNotifications() {
    setBusy(true);
    try {
      let result = "granted-ui";
      if (typeof Notification !== "undefined") {
        result = await Notification.requestPermission();
      }
      write(NOTIF_KEY, result);
    } catch {
      write(NOTIF_KEY, "error");
    } finally {
      setBusy(false);
      nextAfterNotif();
    }
  }

  function skipNotifications() {
    write(NOTIF_KEY, "dismissed");
    nextAfterNotif();
  }

  async function allowGeolocation() {
    setBusy(true);
    try {
      const pos = await requestPosition();
      if (pos) {
        const { latitude, longitude } = pos.coords;
        write(GEO_KEY, "granted");
        write(COORDS_KEY, JSON.stringify({ latitude, longitude, at: Date.now() }));
        await detectCity(latitude, longitude);
      } else {
        write(GEO_KEY, "denied");
      }
    } finally {
      setBusy(false);
      setStep(stepAfterGeo());
    }
  }

  function skipGeolocation() {
    write(GEO_KEY, "dismissed");
    setStep(stepAfterGeo());
  }

  if (step === "notif") {
    return (
      <PermissionScreen
        icon={Bell}
        title="Включить уведомления?"
        description="Будем сообщать самое важное — только по делу, без лишнего."
        perks={[
          { icon: Package, text: "Статус вашего заказа" },
          { icon: Sparkles, text: "Новинки в каталоге" },
          { icon: Tag, text: "Акции и специальные предложения" },
        ]}
        allowLabel="Включить уведомления"
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
        title="Разрешить геолокацию?"
        description="Так мы поймём, в каком вы городе, и подскажем ближайшие магазины."
        perks={[
          { icon: Navigation, text: "Автоматически выберем ваш город" },
          { icon: Store, text: "Покажем магазины поблизости" },
        ]}
        allowLabel="Разрешить геолокацию"
        busy={busy}
        onAllow={allowGeolocation}
        onSkip={skipGeolocation}
      />
    );
  }

  if (step === "intro") {
    return (
      <LogoIntro
        storeName={session?.storeName || "ОПТОВЫЕ ЦЕНЫ 01"}
        onDone={() => {
          write(INTRO_KEY, "1");
          setStep(null);
        }}
      />
    );
  }

  return null;
}
