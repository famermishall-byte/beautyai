"use client";

import { useEffect, useState } from "react";
import type { Feedback } from "@/types";

export function FeedbackManager() {
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in OrderManager.tsx.
    fetch("/api/admin/feedback")
      .then((res) => res.json())
      .then((data) => setFeedback(data.feedback ?? []));
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-black/5 p-6">
      <h2 className="font-medium mb-1">Обратная связь</h2>
      <p className="text-sm text-muted mb-4">Сообщения от покупателей (также приходят в WhatsApp).</p>

      {feedback === null && <p className="text-muted text-sm">Загружаем…</p>}

      {feedback !== null && feedback.length === 0 && (
        <p className="text-muted text-sm">Сообщений пока нет.</p>
      )}

      {feedback && feedback.length > 0 && (
        <div className="flex flex-col gap-4">
          {feedback.map((item) => (
            <div key={item.id} className="border border-black/5 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-medium text-sm">{item.authorName ?? "Без имени"}</span>
                <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
