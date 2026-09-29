"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/Button";

type Broadcast = { id: string; title: string; body: string; url: string | null; created_at: string; sent_count: number | null };

const LINKS = [
  { value: "/", key: "home" },
  { value: "/catalog", key: "catalog" },
] as const;

const field =
  "w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent";

/**
 * «Рассылка» — push всем клиентам магазина (акции, новинки). Запись в push_broadcasts (RLS: только владелец/админ);
 * отправляет триггер → Edge Function send-push, она же пишет sent_count (docs/superpowers/specs/2026-09-29-web-push-design.md).
 */
export function PushBroadcastManager() {
  const t = useTranslations("pushBroadcast");
  const locale = useLocale();
  const { session } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState<string>("/");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<Broadcast[] | null>(null);

  async function load() {
    const { data } = await createBrowserSupabaseClient()
      .from("push_broadcasts")
      .select("id, title, body, url, created_at, sent_count")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as Broadcast[] | null) ?? []);
  }

  useEffect(() => {
    // Data fetching on mount — the documented fetch-in-effect pattern (see OrderManager.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!session || !title.trim() || !body.trim()) return;
    if (!confirm(t("confirm"))) return;
    setSending(true);
    setMessage(null);
    try {
      const { error } = await createBrowserSupabaseClient()
        .from("push_broadcasts")
        .insert({ store_id: session.storeId, title: title.trim(), body: body.trim(), url });
      if (error) {
        setMessage({ ok: false, text: t("failed") });
        return;
      }
      setTitle("");
      setBody("");
      setMessage({ ok: true, text: t("sent") });
      await load();
      // sent_count появляется через пару секунд, когда функция закончит отправку.
      setTimeout(() => void load(), 4000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={send} className="bg-card rounded-[var(--radius-card)] border border-border p-5 flex flex-col gap-3">
        <p className="text-sm text-muted leading-relaxed">{t("intro")}</p>
        <label className="block">
          <span className="block text-xs font-medium text-muted mb-1.5">{t("titleLabel")}</span>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t("titlePlaceholder")} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted mb-1.5">{t("bodyLabel")}</span>
          <textarea className={`${field} resize-none`} rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} placeholder={t("bodyPlaceholder")} />
          <span className="block text-[11px] text-muted text-right mt-1 tabular-nums">{body.length}/300</span>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted mb-1.5">{t("linkLabel")}</span>
          <select className={field} value={url} onChange={(e) => setUrl(e.target.value)}>
            {LINKS.map((l) => (
              <option key={l.value} value={l.value}>
                {t(`links.${l.key}`)}
              </option>
            ))}
          </select>
        </label>
        {message && (
          <p role="status" className={["rounded-xl px-4 py-3 text-sm font-medium", message.ok ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}>
            {message.text}
          </p>
        )}
        <Button type="submit" size="lg" loading={sending} disabled={!title.trim() || !body.trim()} fullWidth>
          <Send className="size-4.5" strokeWidth={2} aria-hidden />
          {t("send")}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-lg mb-2">{t("history")}</h2>
        {history === null ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((b) => (
              <li key={b.id} className="bg-card rounded-[var(--radius-card)] border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-sm">{b.title}</div>
                  <div className="text-xs text-muted shrink-0">{new Date(b.created_at).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <p className="text-sm text-muted mt-1 whitespace-pre-line">{b.body}</p>
                <div className="text-xs mt-2 font-medium text-accent-strong">
                  {b.sent_count === null ? t("sending") : t("sentCount", { n: b.sent_count })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
