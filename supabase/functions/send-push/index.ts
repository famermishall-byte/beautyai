// Edge Function `send-push` (docs/superpowers/specs/2026-09-29-web-push-design.md). Её зовут триггеры базы через pg_net
// (supabase/push.sql) с секретом в заголовке x-push-secret: { event: order_new | order_status | order_edited | broadcast, id }.
// Получателей и подписки читает service-role ключом, отправляет веб-push, удаляет «мёртвые» подписки (404/410).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { broadcastMessage, broadcastTtl, customerOrderMessage, newOrderMessage, staffRecipient, type PushMessage } from "./messages.ts";

const SITE = "https://beautyai-famermishall-3772.vercel.app";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: cfg } = await sb.rpc("push_config");
  const config = (cfg ?? {}) as Record<string, string>;
  if (!config.push_webhook_secret || req.headers.get("x-push-secret") !== config.push_webhook_secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  webpush.setVapidDetails(SITE, config.push_vapid_public, config.push_vapid_private);

  const { event, id } = (await req.json().catch(() => ({}))) as { event?: string; id?: string };
  if (!event || !id) return new Response("Bad request", { status: 400 });

  let userIds: string[] = [];
  let message: PushMessage | null = null;
  let ttl = 60 * 60 * 24;

  if (event === "order_new" || event === "order_status" || event === "order_edited") {
    const { data: order } = await sb
      .from("orders")
      .select("id, number, store_id, branch_id, user_id, status, total_price, delivery_method, customer_name")
      .eq("id", id)
      .maybeSingle();
    if (!order) return Response.json({ sent: 0, reason: "no order" });

    if (event === "order_new") {
      message = newOrderMessage(order);
      const { data: staff } = await sb
        .from("profiles")
        .select("id, role, store_id, branch_id")
        .eq("store_id", order.store_id)
        .in("role", ["owner", "admin", "branch_manager"]);
      userIds = (staff ?? []).filter((p) => staffRecipient(p, order)).map((p) => p.id);
    } else {
      message = customerOrderMessage(event, order);
      if (order.user_id) userIds = [order.user_id];
    }
  } else if (event === "broadcast") {
    const { data: b } = await sb
      .from("push_broadcasts")
      .select("id, store_id, title, body, url, valid_until, status")
      .eq("id", id)
      .maybeSingle();
    if (!b || b.status !== "sending") return Response.json({ sent: 0, reason: "not sending" });
    ttl = broadcastTtl(b.valid_until);
    if (ttl === 0) {
      // Срок «до» уже прошёл — не отправляем старую акцию.
      await sb.from("push_broadcasts").update({ status: "sent", sent_at: new Date().toISOString(), sent_count: 0 }).eq("id", id);
      return Response.json({ sent: 0, reason: "expired" });
    }
    message = broadcastMessage(b);
    const { data: customers } = await sb.from("profiles").select("id").eq("store_id", b.store_id).eq("role", "user");
    userIds = (customers ?? []).map((p) => p.id);
  }

  const finishBroadcast = (count: number) =>
    sb.from("push_broadcasts").update({ status: "sent", sent_at: new Date().toISOString(), sent_count: count }).eq("id", id);

  if (!message || userIds.length === 0) {
    if (event === "broadcast") await finishBroadcast(0);
    return Response.json({ sent: 0 });
  }

  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  const payload = JSON.stringify(message);
  let sent = 0;
  const dead: string[] = [];
  await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: ttl });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    })
  );
  if (dead.length) await sb.from("push_subscriptions").delete().in("id", dead);
  if (event === "broadcast") await finishBroadcast(sent);

  return Response.json({ sent, removed: dead.length });
});
