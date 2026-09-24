"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Feedback } from "@/types";

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
    <div className="bg-card rounded-card border border-border p-6">
      <h2 className="font-medium mb-1">{t("title")}</h2>
      <p className="text-sm text-muted mb-4">{t("subtitle")}</p>

      {feedback === null && <p className="text-muted text-sm">{t("loading")}</p>}

      {feedback !== null && feedback.length === 0 && (
        <p className="text-muted text-sm">{t("empty")}</p>
      )}

      {feedback && feedback.length > 0 && (
        <div className="flex flex-col gap-4">
          {feedback.map((item) => (
            <div key={item.id} className="border border-border rounded-control p-4">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
