"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Eye, Pause, Play, Trash2, Film } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { BannerInterstitial } from "@/components/BannerInterstitial";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useDeleteWithUndo } from "@/components/ui/Feedback";
import { effectiveState, type EffectiveState } from "@/lib/promo-status";
import type { Banner } from "@/types";

type FormState = {
  title: string;
  subtitle: string;
  mediaType: "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  buttonText: string;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
  priority: string;
  product: PickedProduct | null;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  mediaType: "image",
  imageUrl: null,
  videoUrl: null,
  buttonText: "",
  startAt: "",
  endAt: "",
  status: "draft",
  priority: "0",
  product: null,
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function bannerToForm(b: Banner): FormState {
  return {
    title: b.title,
    subtitle: b.subtitle ?? "",
    mediaType: b.videoUrl ? "video" : "image",
    imageUrl: b.imageUrl,
    videoUrl: b.videoUrl,
    buttonText: b.buttonText ?? "",
    startAt: toDatetimeLocal(b.startAt),
    endAt: toDatetimeLocal(b.endAt),
    status: b.status,
    priority: String(b.priority),
    product: b.product ? { id: b.product.id, name: b.product.name, brand: b.product.brand, imageUrl: b.product.imageUrl, price: b.product.price } : null,
  };
}

const STATE_LABEL_KEY: Record<EffectiveState, string> = {
  draft: "draft",
  scheduled: "scheduled",
  active: "active",
  expired: "expired",
  disabled: "disabled",
};

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

function BannerForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FormState;
  onCancel: () => void;
  onSaved: (form: FormState) => Promise<void>;
}) {
  const t = useTranslations("bannerManager");
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mediaBusy) return;
    if (!form.title.trim() || !form.startAt || !form.endAt) {
      setError(t("missing"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaved(form);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const previewBanner: Banner = {
    id: "preview",
    productId: form.product?.id ?? null,
    title: form.title || t("titlePlaceholder"),
    subtitle: form.subtitle || null,
    imageUrl: form.imageUrl,
    videoUrl: form.mediaType === "video" ? form.videoUrl : null,
    buttonText: form.buttonText || null,
    startAt: new Date().toISOString(),
    endAt: new Date(new Date().getTime() + 86400000).toISOString(),
    status: "active",
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: form.product,
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3.5 mb-5">
      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea
        className={inputClass}
        placeholder={t("fields.subtitle")}
        rows={2}
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
      />

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.media")}</div>
        <MediaPicker
          mediaType={form.mediaType}
          imageUrl={form.imageUrl}
          videoUrl={form.videoUrl}
          onChange={(m) => setForm((f) => ({ ...f, ...m }))}
          onBusyChange={setMediaBusy}
        />
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.product")}</div>
        <ProductPicker picked={form.product} onPick={(product) => setForm({ ...form, product })} />
      </div>

      <input className={inputClass} placeholder={t("fields.buttonText")} value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.startAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.endAt")}</div>
          <input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.status")}</div>
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
            <option value="draft">{t("status.draft")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="disabled">{t("status.disabled")}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-muted mb-1.5">{t("fields.priority")}</div>
          <input
            type="number"
            className={inputClass}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {/* на телефоне три кнопки в ряд не помещаются: «Предпросмотр» — отдельной строкой, ниже «Отмена» и «Сохранить» */}
      <div className="grid grid-cols-2 gap-2 pt-1 sm:flex">
        <Button type="button" variant="ghost" className="col-span-2" onClick={() => setPreview(true)}>
          <Eye className="size-4" strokeWidth={2} aria-hidden />
          {t("preview")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={saving} disabled={mediaBusy} className="sm:ml-auto">
          {t("save")}
        </Button>
      </div>

      {preview && <BannerInterstitial banner={previewBanner} onClose={() => setPreview(false)} previewOnly />}
    </form>
  );
}

export function BannerManager() {
  const t = useTranslations("bannerManager");
  const locale = useLocale();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const del = useDeleteWithUndo();
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "expired">("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/banners")
      .then((res) => res.json())
      .then((data: { banners?: Banner[] }) => setBanners(data.banners ?? []))
      .catch(() => setBanners([]));
  }

  useEffect(load, []);

  const filtered = (banners ?? []).filter((b) => {
    if (filter === "all") return true;
    return effectiveState(b) === filter;
  });

  async function submitForm(id: string | null, form: FormState) {
    const body = {
      title: form.title,
      subtitle: form.subtitle || null,
      imageUrl: form.imageUrl,
      videoUrl: form.mediaType === "video" ? form.videoUrl : null,
      productId: form.product?.id ?? null,
      buttonText: form.buttonText || null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      status: form.status,
      priority: Number(form.priority) || 0,
    };
    const res = await fetch(id ? `/api/admin/banners/${id}` : "/api/admin/banners", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("save");
    setCreating(false);
    setEditingId(null);
    load();
  }

  function handleDelete(id: string) {
    setError(null);
    void del.remove({
      id,
      question: t("deleteConfirm"),
      commit: async () => {
        const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE", keepalive: true });
        if (!res.ok) {
          setError(t("deleteFailed"));
          return false;
        }
        load();
        return true;
      },
    });
  }

  async function toggleDisabled(banner: Banner) {
    setError(null);
    const nextStatus = banner.status === "disabled" ? "active" : "disabled";
    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        videoUrl: banner.videoUrl,
        productId: banner.productId,
        buttonText: banner.buttonText,
        startAt: banner.startAt,
        endAt: banner.endAt,
        status: nextStatus,
        priority: banner.priority,
      }),
    });
    if (!res.ok) {
      setError(t("toggleFailed"));
      return;
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          <Chip label={t("filters.all")} active={filter === "all"} onClick={() => setFilter("all")} />
          <Chip label={t("filters.active")} active={filter === "active"} onClick={() => setFilter("active")} />
          <Chip label={t("filters.draft")} active={filter === "draft"} onClick={() => setFilter("draft")} />
          <Chip label={t("filters.expired")} active={filter === "expired"} onClick={() => setFilter("expired")} />
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0 ml-2">
            <Plus className="size-4" strokeWidth={2.25} aria-hidden />
            {t("create")}
          </Button>
        )}
      </div>

      {creating && <BannerForm initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSaved={(form) => submitForm(null, form)} />}

      {error && <p className="text-sm text-error mb-3">{error}</p>}

      {banners === null && <p className="text-muted text-sm">{t("loading")}</p>}
      {banners !== null && filtered.length === 0 && <p className="text-muted text-sm">{t("empty")}</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((banner) =>
          del.hidden.has(banner.id) ? null : editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              initial={bannerToForm(banner)}
              onCancel={() => setEditingId(null)}
              onSaved={(form) => submitForm(banner.id, form)}
            />
          ) : (
            <div key={banner.id} className="bg-card rounded-2xl border border-black/5 p-4 flex gap-3.5 items-center">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-accent-soft shrink-0">
                {banner.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
                {banner.videoUrl && (
                  <span className="absolute bottom-1 right-1 size-5 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <Film className="size-3" strokeWidth={2} aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{banner.title}</div>
                <div className="text-xs text-muted truncate">{banner.product?.name ?? t("noProduct")}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <span className="text-[11px] rounded-full bg-accent-soft text-accent px-2 py-0.5 whitespace-nowrap">
                    {t(`status.${STATE_LABEL_KEY[effectiveState(banner)]}`)}
                  </span>
                  <span className="text-[11px] text-muted whitespace-nowrap">{t("priorityShort", { n: banner.priority })}</span>
                  <span className="text-[11px] text-muted whitespace-nowrap">
                    {new Date(banner.startAt).toLocaleDateString(locale)} – {new Date(banner.endAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(banner.id)}
                  aria-label={t("edit")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  <Eye className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  onClick={() => toggleDisabled(banner)}
                  aria-label={banner.status === "disabled" ? t("enable") : t("disable")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  {banner.status === "disabled" ? <Play className="size-4" strokeWidth={2} aria-hidden /> : <Pause className="size-4" strokeWidth={2} aria-hidden />}
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  aria-label={t("delete")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-error-soft hover:text-error"
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
