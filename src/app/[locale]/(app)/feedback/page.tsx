"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function FeedbackPage() {
  const t = useTranslations("feedback");
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
        setError(data.error ?? t("failed"));
        return;
      }
      setSent(true);
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3.5 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-full bg-accent-soft text-accent shrink-0">
          <MessageCircle className="size-5" strokeWidth={1.85} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl leading-tight">{t("title")}</h1>
          <p className="text-muted text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {sent && (
        <div className="flex items-center gap-2.5 text-sm bg-success-soft text-success rounded-control px-4 py-3 mb-4 animate-rise-in">
          <CheckCircle2 className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
          {t("thanks")}
        </div>
      )}
      {error && (
        <div className="text-sm bg-error-soft text-error rounded-control px-4 py-3 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-card border border-border p-5 shadow-card">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("placeholder")}
          rows={6}
          className="w-full rounded-control border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent resize-none mb-4"
        />
        <Button type="submit" size="lg" loading={submitting} disabled={!message.trim()} fullWidth>
          {t("send")}
        </Button>
      </form>
    </main>
  );
}
