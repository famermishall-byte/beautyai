"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Pencil, Send, Trash2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/Button";
import { formatDateInput, formatTimeInput, parseDateInput, parseTimeInput, toDateInput } from "@/lib/date-range";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  created_at: string;
  sent_count: number | null;
  status: "scheduled" | "sending" | "sent";
  scheduled_at: string | null;
  sent_at: string | null;
  valid_until: string | null;
};

const LINKS = [
  { value: "/", key: "home" },
  { value: "/catalog", key: "catalog" },
] as const;

const field =
  "w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent";

const pad = (n: number) => String(n).padStart(2, "0");
/** ДД.ММ.ГГГГ из "2026-10-05" (срок «до» хранится датой). */
const isoDateToInput = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const inputToIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => inputToIsoDate(new Date());

/**
 * «Рассылка» — push всем клиентам (акции, новинки): сейчас или по расписанию, со сроком «до» (docs/superpowers/specs/
 * 2026-09-29-push-schedule-design.md). Запланированную можно изменить или отменить; отправленную — только удалить из истории.
 * Запись в push_broadcasts (RLS: владелец/админ); отправляет триггер/pg_cron → Edge Function send-push.
 */
export function PushBroadcastManager() {
  const t = useTranslations("pushBroadcast");
  const locale = useLocale();
  const { session } = useSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState<string>("/");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [until, setUntil] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<Broadcast[] | null>(null);
  // «Сейчас» для проверки «время уже прошло» — обновляется раз в 30 с (не вызываем Date.now() при отрисовке).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    const { data } = await createBrowserSupabaseClient()
      .from("push_broadcasts")
      .select("id, title, body, url, created_at, sent_count, status, scheduled_at, sent_at, valid_until")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as Broadcast[] | null) ?? []);
  }

  useEffect(() => {
    // Data fetching on mount — the documented fetch-in-effect pattern (see OrderManager.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  // Проверка полей: время отправки (только в будущем) и срок «до» (не раньше сегодня и не раньше отправки).
  const day = parseDateInput(date);
  const clock = parseTimeInput(time);
  const scheduledAt = when === "later" && day && clock ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.hours, clock.minutes) : null;
  const untilDay = until ? parseDateInput(until) : null;
  const scheduleError =
    when === "later" && (date || time)
      ? !day || !clock
        ? t("errors.when")
        : scheduledAt!.getTime() <= now
          ? t("errors.past")
          : null
      : null;
  const untilError = until
    ? !untilDay
      ? t("errors.until")
      : inputToIsoDate(untilDay) < todayIso() || (scheduledAt && inputToIsoDate(untilDay) < inputToIsoDate(scheduledAt))
        ? t("errors.untilBefore")
        : null
    : null;
  const ready = !!title.trim() && !!body.trim() && (when === "now" || !!scheduledAt) && !scheduleError && !untilError;

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setUrl("/");
    setWhen("now");
    setDate("");
    setTime("");
    setUntil("");
  }

  function startEdit(b: Broadcast) {
    const at = b.scheduled_at ? new Date(b.scheduled_at) : null;
    setEditingId(b.id);
    setTitle(b.title);
    setBody(b.body);
    setUrl(b.url || "/");
    setWhen("later");
    setDate(at ? toDateInput(at) : "");
    setTime(at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : "");
    setUntil(b.valid_until ? isoDateToInput(b.valid_until) : "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session || !ready) return;
    const values = {
      title: title.trim(),
      body: body.trim(),
      url,
      scheduled_at: when === "later" && scheduledAt ? scheduledAt.toISOString() : null,
      valid_until: untilDay ? inputToIsoDate(untilDay) : null,
    };
    if (!editingId && when === "now" && !confirm(t("confirm"))) return;
    setSending(true);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = editingId
        ? await supabase.from("push_broadcasts").update(values).eq("id", editingId).eq("status", "scheduled")
        : await supabase.from("push_broadcasts").insert({ store_id: session.storeId, ...values });
      if (error) {
        setMessage({ ok: false, text: error.message.includes("изменить нельзя") ? t("errors.alreadySent") : t("failed") });
        return;
      }
      setMessage({ ok: true, text: editingId ? t("updated") : when === "later" ? t("scheduledOk") : t("sent") });
      resetForm();
      await load();
      // sent_count появляется через пару секунд, когда функция закончит отправку.
      setTimeout(() => void load(), 4000);
    } finally {
      setSending(false);
    }
  }

  async function remove(b: Broadcast) {
    if (!confirm(b.status === "scheduled" ? t("confirmCancel") : t("confirmDelete"))) return;
    const { error } = await createBrowserSupabaseClient().from("push_broadcasts").delete().eq("id", b.id);
    if (error) {
      setMessage({ ok: false, text: t("failed") });
      return;
    }
    if (editingId === b.id) resetForm();
    await load();
  }

  const stamp = (iso: string) => new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="bg-card rounded-[var(--radius-card)] border border-border p-5 flex flex-col gap-3">
        {editingId ? (
          <p className="text-sm font-semibold text-accent-strong">{t("editing")}</p>
        ) : (
          <p className="text-sm text-muted leading-relaxed">{t("intro")}</p>
        )}
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

        <fieldset>
          <legend className="block text-xs font-medium text-muted mb-1.5">{t("whenLabel")}</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["now", "later"] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={when === w}
                disabled={!!editingId && w === "now"}
                onClick={() => setWhen(w)}
                className={[
                  "rounded-[var(--radius-control)] border px-3 min-h-11 text-sm font-medium transition disabled:opacity-40",
                  when === w ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-card",
                ].join(" ")}
              >
                {t(w === "now" ? "whenNow" : "whenLater")}
              </button>
            ))}
          </div>
          {when === "later" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                className={field}
                aria-label={t("dateLabel")}
                placeholder="ДД.ММ.ГГГГ"
                inputMode="numeric"
                maxLength={10}
                value={date}
                onChange={(e) => setDate(formatDateInput(e.target.value))}
              />
              <input
                className={field}
                aria-label={t("timeLabel")}
                placeholder="ЧЧ:ММ"
                inputMode="numeric"
                maxLength={5}
                value={time}
                onChange={(e) => setTime(formatTimeInput(e.target.value))}
              />
            </div>
          )}
          {scheduleError && <p className="text-xs text-error mt-1.5">{scheduleError}</p>}
        </fieldset>

        <label className="block">
          <span className="block text-xs font-medium text-muted mb-1.5">{t("untilLabel")}</span>
          <input className={field} placeholder="ДД.ММ.ГГГГ" inputMode="numeric" maxLength={10} value={until} onChange={(e) => setUntil(formatDateInput(e.target.value))} />
          <span className={["block text-xs mt-1.5", untilError ? "text-error" : "text-muted"].join(" ")}>{untilError ?? t("untilHint")}</span>
        </label>

        {message && (
          <p role="status" className={["rounded-xl px-4 py-3 text-sm font-medium", message.ok ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}>
            {message.text}
          </p>
        )}
        <Button type="submit" size="lg" loading={sending} disabled={!ready} fullWidth>
          {when === "later" ? <CalendarClock className="size-4.5" strokeWidth={2} aria-hidden /> : <Send className="size-4.5" strokeWidth={2} aria-hidden />}
          {editingId ? t("saveChanges") : when === "later" ? t("schedule") : t("send")}
        </Button>
        {editingId && (
          <button type="button" onClick={resetForm} className="text-sm text-muted underline min-h-11">
            {t("cancelEdit")}
          </button>
        )}
      </form>

      <div>
        <h2 className="font-display text-lg mb-2">{t("history")}</h2>
        {history === null ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((b) => {
              const expired = !!b.valid_until && b.valid_until < todayIso();
              return (
                <li key={b.id} className={["bg-card rounded-[var(--radius-card)] border p-4", editingId === b.id ? "border-accent" : "border-border"].join(" ")}>
                  <div className="font-medium text-sm">{b.title}</div>
                  <p className="text-sm text-muted mt-1 whitespace-pre-line">{b.body}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2 font-medium">
                    {b.status === "scheduled" && b.scheduled_at && <span className="text-accent-strong">{t("scheduledFor", { at: stamp(b.scheduled_at) })}</span>}
                    {b.status === "sending" && <span className="text-accent-strong">{t("sending")}</span>}
                    {b.status === "sent" && (
                      <span className="text-success">
                        {t("sentCount", { n: b.sent_count ?? 0 })} · {stamp(b.sent_at ?? b.created_at)}
                      </span>
                    )}
                    {b.valid_until && <span className={expired ? "text-muted" : "text-foreground"}>{expired ? t("expired") : t("validUntil", { date: isoDateToInput(b.valid_until) })}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {b.status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="rounded-full border border-border px-3.5 min-h-11 text-sm font-medium inline-flex items-center gap-1.5"
                      >
                        <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
                        {t("edit")}
                      </button>
                    )}
                    {b.status !== "sending" && (
                      <button
                        type="button"
                        onClick={() => remove(b)}
                        className="rounded-full border border-border px-3.5 min-h-11 text-sm font-medium inline-flex items-center gap-1.5 text-error"
                      >
                        <Trash2 className="size-4" strokeWidth={1.9} aria-hidden />
                        {b.status === "scheduled" ? t("cancelScheduled") : t("delete")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
