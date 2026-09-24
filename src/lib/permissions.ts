"use client";

// Общая логика для двух мест: первый запуск (FirstRunFlow.tsx, один раз сразу после
// регистрации) и ручное вкл/выкл в профиле (NotificationGeoSettings.tsx, в любой момент позже).
// Один источник правды на оба места, чтобы они не разошлись по ключам/статусам.
import type { Branch } from "@/types";
import { setStoredCity } from "@/lib/city";

const NOTIF_KEY = "beautyai-notif-prompt";
const GEO_KEY = "beautyai-geo-prompt";
const COORDS_KEY = "beautyai-coords";

function readPermissionFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage unavailable: treat as already answered so we never nag on every load.
    return "unavailable";
  }
}

function writePermissionFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // недоступно — окно/переключатель просто не запомнит выбор до следующего раза
  }
}

export function notifDecided(): boolean {
  return readPermissionFlag(NOTIF_KEY) !== null || (typeof Notification !== "undefined" && Notification.permission !== "default");
}

export function geoDecided(): boolean {
  return readPermissionFlag(GEO_KEY) !== null;
}

/** Реальное разрешение браузера — если "denied", включить обратно можно только его настройками. */
export function notifBlockedByBrowser(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "denied";
}

/**
 * Наше собственное представление о том, включено ли — не совпадает 1-в-1 с разрешением браузера:
 * push пока не отправляется (см. NotificationPrompt — UI + разрешение only), поэтому "выключено"
 * здесь означает «пользователь не хочет, чтобы его считали согласившимся», а не отзыв разрешения
 * у браузера (JS не может отозвать Notification.permission — это может только сам пользователь
 * в настройках браузера).
 */
export function isNotifOn(): boolean {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    return readPermissionFlag(NOTIF_KEY) !== "dismissed";
  }
  return false;
}

export function isGeoOn(): boolean {
  return readPermissionFlag(GEO_KEY) === "granted";
}

export async function requestNotifPermission(): Promise<string> {
  try {
    const result = typeof Notification !== "undefined" ? await Notification.requestPermission() : "granted-ui";
    writePermissionFlag(NOTIF_KEY, result);
    return result;
  } catch {
    writePermissionFlag(NOTIF_KEY, "error");
    return "error";
  }
}

export function dismissNotif() {
  writePermissionFlag(NOTIF_KEY, "dismissed");
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

// Best-effort: turn coordinates into a city name and, if it matches a city
// where the store has a branch, select it. Uses BigDataCloud's free
// client-side reverse-geocoding endpoint (no API key) — the coordinates are
// sent to that third-party service, and only when the user allowed location.
async function detectCity(latitude: number, longitude: number) {
  try {
    const [branchesRes, geoRes] = await Promise.all([
      fetch("/api/branches"),
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ru`),
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

export async function requestGeoPermission(): Promise<"granted" | "denied"> {
  const pos = await requestPosition();
  if (pos) {
    const { latitude, longitude } = pos.coords;
    writePermissionFlag(GEO_KEY, "granted");
    writePermissionFlag(COORDS_KEY, JSON.stringify({ latitude, longitude, at: Date.now() }));
    await detectCity(latitude, longitude);
    return "granted";
  }
  writePermissionFlag(GEO_KEY, "denied");
  return "denied";
}

export function dismissGeo() {
  writePermissionFlag(GEO_KEY, "dismissed");
}
