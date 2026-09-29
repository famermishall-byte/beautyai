"use client";

// Веб-push в браузере (docs/superpowers/specs/2026-09-29-web-push-design.md): подписка этого браузера хранится в
// push_subscriptions (RPC save_push_subscription / delete_push_subscription), отправляет Edge Function send-push.
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** Публичный VAPID-ключ (он и так публичный; приватный — только в Supabase Vault). */
export const VAPID_PUBLIC_KEY = "BIpPqaknLfFRRxFHmcKw-23bMJls3LJKUEWEiW-1i8VpowexYFiluhPAHuej2SPam_7sFjjkX69HnQAr86IcPJI";

/** Есть ли веб-push на этом устройстве (нет — например, в оболочке Capacitor или в Safari вне экрана «Домой»). */
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Подписать этот браузер за текущим пользователем. Можно звать повторно — подписка просто обновится. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const { error } = await createBrowserSupabaseClient().rpc("save_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Отписать этот браузер (переключатель «Уведомления» выключен). */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await createBrowserSupabaseClient().rpc("delete_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch {
    // не получилось — подписка просто останется до следующего выключения
  }
}
