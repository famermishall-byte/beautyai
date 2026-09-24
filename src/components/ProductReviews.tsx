"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star, Trash2, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/Button";
import type { ProductReview } from "@/types";

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={size} strokeWidth={1.75} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useTranslations("productReviews");
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={t("rateStars", { count: n })}
          aria-pressed={value === n}
          className="p-0.5 text-accent transition active:scale-90"
        >
          <Star className="size-7" strokeWidth={1.75} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

/**
 * Отзывы и звёзды покупателей — публично видны всем на странице товара; оставить может только
 * купивший (сервер сам проверяет по заказам, см. /api/reviews). Раздел 5 спеки
 * docs/superpowers/specs/2026-09-23-marketing-and-catalog-admin-design.md ("План В").
 */
export function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations("productReviews");
  const { session } = useSession();
  const canModerate = session?.role === "admin" || session?.role === "owner";

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [reason, setReason] = useState<"no-purchase" | "already-reviewed" | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((res) => (res.ok ? res.json() : { reviews: [], average: null, canReview: false, reason: null }))
      .then((data: { reviews: ProductReview[]; average: number | null; canReview: boolean; reason: "no-purchase" | "already-reviewed" | null }) => {
        setReviews(data.reviews ?? []);
        setAverage(data.average ?? null);
        setCanReview(Boolean(data.canReview));
        setReason(data.reason ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("error"));
        return;
      }
      setFormOpen(false);
      setRating(0);
      setComment("");
      load();
    } catch {
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-lg flex items-center gap-2">
          {t("title")}
          {average !== null && (
            <span className="text-sm font-normal text-muted flex items-center gap-1">
              <Star className="size-3.5 text-accent" strokeWidth={1.75} fill="currentColor" aria-hidden />
              {average.toFixed(1)} · {t("countLabel", { count: reviews.length })}
            </span>
          )}
        </h2>
        {!formOpen && (
          <Button
            variant="secondary"
            size="sm"
            disabled={!canReview}
            title={reason === "no-purchase" ? t("unavailableNoPurchase") : reason === "already-reviewed" ? t("unavailableReviewed") : undefined}
            onClick={() => setFormOpen(true)}
          >
            {t("leaveReview")}
          </Button>
        )}
      </div>

      {!formOpen && !canReview && reason && (
        <p className="text-xs text-muted mb-4">{reason === "no-purchase" ? t("unavailableNoPurchase") : t("unavailableReviewed")}</p>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-[var(--radius-card)] p-4 mb-4 flex flex-col gap-3">
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={3}
            className="w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent resize-none"
          />
          {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={rating < 1 || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {submitting ? t("sending") : t("submit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={submitting}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-[var(--radius-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars value={r.rating} />
                  <div className="text-xs text-muted mt-1">
                    {r.authorName || t("anonymous")} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                {(r.isOwn || canModerate) && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    aria-label={t("delete")}
                    className="p-1.5 rounded-full text-muted transition hover:text-error hover:bg-error-soft shrink-0"
                  >
                    <Trash2 className="size-4" strokeWidth={1.85} aria-hidden />
                  </button>
                )}
              </div>
              {r.comment && <p className="text-sm mt-2 leading-relaxed whitespace-pre-line">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
