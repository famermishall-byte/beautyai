"use client";

import { useState, type FormEvent } from "react";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const branchId = (() => {
        try {
          return localStorage.getItem("beautyai-branch");
        } catch {
          return null;
        }
      })();

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), branchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить сообщение.");
        return;
      }
      setSent(true);
      setMessage("");
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">Обратная связь</h1>
      <p className="text-muted mb-8">
        Напишите нам — сообщение откроется в WhatsApp и сразу отправится нам.
      </p>

      {sent && (
        <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3 mb-4">
          Спасибо! Сообщение отправлено.
        </p>
      )}
      {error && <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ваше сообщение…"
          rows={6}
          className="w-full rounded-lg border border-black/10 bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="self-start rounded-full bg-accent text-white px-6 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {submitting ? "Отправляем…" : "Отправить"}
        </button>
      </form>
    </main>
  );
}
