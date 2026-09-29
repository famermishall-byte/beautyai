"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, ArrowUp, ArrowDown, Eye, EyeOff, Pencil, Trash2, Loader2, Video } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { Button } from "@/components/ui/Button";
import { MediaPicker, type MediaValue } from "@/components/admin/MediaPicker";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { HERO_ACTIONS, INLINE_ACTIONS, moveSlide } from "@/lib/home-slides";
import type { HomeSlide, SlideAction, SlidePlacement } from "@/types";

type FormState = MediaValue & {
  title: string;
  subtitle: string;
  action: SlideAction;
  product: PickedProduct | null;
  category: string;
};

const EMPTY_FORM: FormState = { mediaType: "image", imageUrl: null, videoUrl: null, title: "", subtitle: "", action: "promo", product: null, category: "" };

function slideToForm(s: HomeSlide): FormState {
  return {
    mediaType: s.mediaType,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    title: s.title ?? "",
    subtitle: s.subtitle ?? "",
    action: s.action,
    product: s.product ? { id: s.product.id, name: s.product.name, brand: s.product.brand, imageUrl: s.product.imageUrl, price: s.product.price } : null,
    category: s.category ?? "",
  };
}

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";
const iconBase = "w-9 h-9 rounded-full flex items-center justify-center text-muted transition disabled:opacity-30 disabled:pointer-events-none";
const iconButton = `${iconBase} hover:bg-black/5 hover:text-foreground`;
const deleteButton = `${iconBase} hover:bg-error-soft hover:text-error`;

function SlideForm({
  placement,
  initial,
  onCancel,
  onSave,
}: {
  placement: SlidePlacement;
  initial: FormState;
  onCancel: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const t = useTranslations("homeSlides");
  const tg = useTranslations("catalogGroups");
  const inline = placement === "inline";
  const actions = inline ? INLINE_ACTIONS : HERO_ACTIONS;
  const actionLabel = (a: SlideAction) => (inline ? t(`inline.actions.${a}`) : t(`actions.${a}`));
  const [form, setForm] = useState(initial);
  const radioName = useId(); // создание и правка могут быть открыты одновременно
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.mediaType === "video" ? !form.videoUrl : !form.imageUrl) {
      setError(t("needMedia"));
      return;
    }
    if ((form.action === "cart" || form.action === "product") && !form.product) {
      setError(inline ? t("inline.needProductOpen") : t("needProduct"));
      return;
    }
    if (form.action === "category" && !form.category) {
      setError(t("inline.needCategory"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3.5 mb-5">
      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.media")}</div>
        <MediaPicker
          mediaType={form.mediaType}
          imageUrl={form.imageUrl}
          videoUrl={form.videoUrl}
          onChange={(m) => setForm((f) => ({ ...f, ...m }))}
        />
      </div>

      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea
        className={inputClass}
        placeholder={t("fields.subtitle")}
        rows={2}
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
      />

      <fieldset>
        <legend className="text-xs text-muted mb-1.5">{t("fields.action")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <label
              key={a}
              className={[
                "min-h-11 flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm cursor-pointer transition",
                form.action === a ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border text-foreground",
              ].join(" ")}
            >
              <input
                type="radio"
                name={radioName}
                value={a}
                checked={form.action === a}
                onChange={() => setForm({ ...form, action: a })}
                className="accent-accent size-4 shrink-0"
              />
              {actionLabel(a)}
            </label>
          ))}
        </div>
      </fieldset>

      {(form.action === "cart" || form.action === "product") && (
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.product")}</div>
          <ProductPicker picked={form.product} onPick={(product) => setForm({ ...form, product })} />
        </div>
      )}

      {form.action === "category" && (
        <label className="block">
          <span className="block text-xs text-muted mb-1.5">{t("fields.category")}</span>
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">{t("inline.categoryPlaceholder")}</option>
            {CATEGORY_GROUPS.map((g) => (
              <option key={g.key} value={g.name}>
                {tg(`${g.key}.title`)}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={saving} className="ml-auto">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Промо-слайды верхнего слайдера на главной: фото/видео, действие, порядок, показать/скрыть. */
export function HomeSlideManager({ placement = "hero" }: { placement?: SlidePlacement }) {
  const t = useTranslations("homeSlides");
  const tg = useTranslations("catalogGroups");
  const inline = placement === "inline";
  const actionLabel = (a: SlideAction) => (inline ? t(`inline.actions.${a}`) : t(`actions.${a}`));
  const groupLabel = (name: string) => {
    const g = CATEGORY_GROUPS.find((x) => x.name === name);
    return g ? tg(`${g.key}.title`) : name;
  };
  const [slides, setSlides] = useState<HomeSlide[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return fetch(`/api/admin/home-slides?placement=${placement}`)
      .then((res) => (res.ok ? res.json() : { slides: [] }))
      .then((data: { slides?: HomeSlide[] }) => setSlides(data.slides ?? []))
      .catch(() => setSlides([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  async function submitForm(id: string | null, form: FormState) {
    const withProduct = form.action === "cart" || form.action === "product";
    const body = {
      placement,
      category: form.action === "category" ? form.category : null,
      mediaType: form.mediaType,
      imageUrl: form.imageUrl,
      videoUrl: form.mediaType === "video" ? form.videoUrl : null,
      title: form.title,
      subtitle: form.subtitle,
      action: form.action,
      productId: withProduct ? (form.product?.id ?? null) : null,
    };
    const res = await fetch(id ? `/api/admin/home-slides/${id}` : "/api/admin/home-slides", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "");
    }
    setCreating(false);
    setEditingId(null);
    await load();
  }

  async function patch(id: string, body: { active?: boolean; priority?: number }) {
    const res = await fetch(`/api/admin/home-slides/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function handleMove(index: number, dir: -1 | 1) {
    if (!slides || busy) return;
    const next = moveSlide(slides, index, dir);
    if (next === slides) return;
    setBusy(true);
    setError(null);
    setSlides(next);
    // Сохраняем priority = индекс только для тех, у кого он поменялся.
    const changed = next.map((s, i) => ({ s, i })).filter(({ s, i }) => s.priority !== i);
    const results = await Promise.all(changed.map(({ s, i }) => patch(s.id, { priority: i })));
    if (results.some((ok) => !ok)) setError(t("moveFailed"));
    await load();
    setBusy(false);
  }

  async function toggleActive(slide: HomeSlide) {
    setBusy(true);
    setError(null);
    if (!(await patch(slide.id, { active: !slide.active }))) setError(t("toggleFailed"));
    await load();
    setBusy(false);
  }

  async function handleDelete(slide: HomeSlide) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/home-slides/${slide.id}`, { method: "DELETE" });
    if (!res.ok) setError(t("deleteFailed"));
    await load();
    setBusy(false);
  }

  if (slides === null) return <Loader2 className="size-5 animate-spin text-muted mx-auto my-8" aria-hidden />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{inline ? t("inline.intro") : t("intro")}</p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0">
            <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            {inline ? t("inline.create") : t("create")}
          </Button>
        )}
      </div>

      {creating && <SlideForm placement={placement} initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSave={(form) => submitForm(null, form)} />}

      {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{error}</p>}

      {slides.length === 0 && !creating && <p className="text-sm text-muted">{inline ? t("inline.empty") : t("empty")}</p>}

      <div className="flex flex-col gap-3">
        {slides.map((slide, i) =>
          editingId === slide.id ? (
            <SlideForm key={slide.id} placement={placement} initial={slideToForm(slide)} onCancel={() => setEditingId(null)} onSave={(form) => submitForm(slide.id, form)} />
          ) : (
            <div
              key={slide.id}
              className={`bg-card border border-border rounded-[var(--radius-card)] p-3 flex flex-col gap-2 ${slide.active ? "" : "opacity-70"}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-20 aspect-[16/11] rounded-lg overflow-hidden bg-accent-soft shrink-0">
                  {slide.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  {slide.mediaType === "video" && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-foreground/70 text-background p-1">
                      <Video className="size-3" strokeWidth={2.25} aria-hidden />
                      <span className="sr-only">{t("media.video")}</span>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{slide.title || t("untitled")}</div>
                  <div className="text-xs text-muted truncate">
                    {actionLabel(slide.action)}
                    {(slide.action === "cart" || slide.action === "product") && ` · ${slide.product?.name ?? t("noProduct")}`}
                    {slide.action === "category" && ` · ${slide.category ? groupLabel(slide.category) : t("inline.noCategory")}`}
                  </div>
                  {inline ? (
                    <span
                      className={`inline-block mt-1 text-[11px] rounded-full px-2 py-0.5 ${slide.active ? "bg-accent-soft text-accent-strong" : "bg-black/5 text-muted"}`}
                    >
                      {slide.active ? t("inline.active") : t("inline.inactive")}
                    </span>
                  ) : (
                    !slide.active && (
                      <span className="inline-block mt-1 text-[11px] rounded-full bg-black/5 text-muted px-2 py-0.5">{t("hidden")}</span>
                    )
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 justify-end">
                {!inline && (
                  <>
                    <button type="button" onClick={() => handleMove(i, -1)} disabled={busy || i === 0} aria-label={t("moveUp")} className={iconButton}>
                      <ArrowUp className="size-4" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(i, 1)}
                      disabled={busy || i === slides.length - 1}
                      aria-label={t("moveDown")}
                      className={iconButton}
                    >
                      <ArrowDown className="size-4" strokeWidth={2} aria-hidden />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => toggleActive(slide)}
                  disabled={busy}
                  aria-label={inline ? (slide.active ? t("inline.hide") : t("inline.show")) : slide.active ? t("hide") : t("show")}
                  className={iconButton}
                >
                  {slide.active ? <EyeOff className="size-4" strokeWidth={2} aria-hidden /> : <Eye className="size-4" strokeWidth={2} aria-hidden />}
                </button>
                <button type="button" onClick={() => setEditingId(slide.id)} disabled={busy} aria-label={t("edit")} className={iconButton}>
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(slide)}
                  disabled={busy}
                  aria-label={t("delete")}
                  className={deleteButton}
                >
                  <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
