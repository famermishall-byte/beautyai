"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { whatsappChatUrl, whatsappDigits } from "@/lib/whatsapp";
import type { Feedback } from "@/types";

/**
 * Сообщения «Обратной связи». С 29.09 у каждого нового сообщения есть контакты клиента (имя, телефон,
 * почта — сохраняются при отправке), чтобы филиал мог связаться: WhatsApp и звонок в один тап.
 */
export function FeedbackManager() {
  const t = useTranslations("feedbackAdmin");
  const locale = useLocale();
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in OrderManager.tsx.
    fetch("/api/admin/feedback")
      .then((res) => res.json())
      .then((data) => setFeedback(data.feedback ?? []));
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-black/5 p-6">
      <h2 className="font-medium mb-1">{t("title")}</h2>
      <p className="text-sm text-muted mb-4">{t("subtitle")}</p>

      {feedback === null && <p className="text-muted text-sm">{t("loading")}</p>}

      {feedback !== null && feedback.length === 0 && (
        <p className="text-muted text-sm">{t("empty")}</p>
      )}

      {feedback && feedback.length > 0 && (
        <div className="flex flex-col gap-4">
          {feedback.map((item) => (
            <div key={item.id} className="border border-black/5 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-medium text-sm">{item.authorName ?? t("noName")}</span>
                <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString(locale)}</span>
              </div>
              {item.branchName && (
                <div className="text-xs text-accent bg-accent-soft rounded-full px-2 py-0.5 w-fit mb-2">
                  {item.branchName}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{item.message}</p>

              {(item.contactPhone || item.authorEmail) && (
                <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                  {item.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-4 text-muted shrink-0" strokeWidth={1.85} aria-hidden />
                      <span className="tabular-nums">{item.contactPhone}</span>
                    </div>
                  )}
                  {item.authorEmail && (
                    <a href={`mailto:${item.authorEmail}`} className="flex items-center gap-2 text-sm text-muted break-all hover:text-accent">
                      <Mail className="size-4 shrink-0" strokeWidth={1.85} aria-hidden />
                      {item.authorEmail}
                    </a>
                  )}
                  {item.contactPhone && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <a
                        href={whatsappChatUrl(item.contactPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-[#25D366] text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      >
                        <MessageCircle className="size-4" strokeWidth={2} aria-hidden />
                        {t("whatsapp")}
                      </a>
                      <a
                        href={`tel:+${whatsappDigits(item.contactPhone)}`}
                        className="rounded-full border border-border bg-card py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Phone className="size-4" strokeWidth={1.85} aria-hidden />
                        {t("call")}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
