"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Eye, Pause, Play, Trash2, Loader2, ImageOff } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { BannerInterstitial } from "@/components/BannerInterstitial";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { effectiveState, type EffectiveState } from "@/lib/promo-status";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Banner } from "@/types";

const TARGET_W = 960;
const TARGET_H = 660; // 16:11, как HeroSlider

async function toBannerJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = TARGET_W / TARGET_H;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > dstRatio) {
    sw = bitmap.height * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / dstRatio;
    sy = (bitmap.height - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85));
}

type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string | null;
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
  imageUrl: null,
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
    imageUrl: b.imageUrl,
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

const inputClass = "w-full rounded-control border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("choosePhoto"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const storeId = session ? (await supabase.from("profiles").select("store_id").eq("id", user.id).single()).data?.store_id : null;
      if (!storeId) throw new Error("store");
      const blob = await toBannerJpeg(file);
      const path = `${storeId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setForm((f) => ({ ...f, imageUrl: `${data.publicUrl}?v=${Date.now()}` }));
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} className="bg-card rounded-card border border-border p-5 flex flex-col gap-3.5 mb-5">
      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea
        className={inputClass}
        placeholder={t("fields.subtitle")}
        rows={2}
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
      />

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.image")}</div>
        {form.imageUrl ? (
          <div className="relative rounded-control overflow-hidden aspect-[16/11] bg-accent-soft mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-control aspect-[16/11] bg-accent-soft flex items-center justify-center mb-2 text-muted">
            <ImageOff className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-accent cursor-pointer">
          {uploading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {form.imageUrl ? t("changePhoto") : t("addPhoto")}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </label>
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

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => setPreview(true)}>
          <Eye className="size-4" strokeWidth={2} aria-hidden />
          {t("preview")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={saving} className="ml-auto">
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

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("deleteFailed"));
      return;
    }
    load();
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
          editingId === banner.id ? (
            <BannerForm
              key={banner.id}
              initial={bannerToForm(banner)}
              onCancel={() => setEditingId(null)}
              onSaved={(form) => submitForm(banner.id, form)}
            />
          ) : (
            <div key={banner.id} className="bg-card rounded-card border border-border p-4 flex gap-3.5 items-center">
              <div className="w-16 h-16 rounded-control overflow-hidden bg-accent-soft shrink-0">
                {banner.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{banner.title}</div>
                <div className="text-xs text-muted truncate">{banner.product?.name ?? t("noProduct")}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xs rounded-full bg-accent-soft text-accent px-2 py-0.5">
                    {t(`status.${STATE_LABEL_KEY[effectiveState(banner)]}`)}
                  </span>
                  <span className="text-2xs text-muted">{t("priorityShort", { n: banner.priority })}</span>
                  <span className="text-2xs text-muted">
                    {new Date(banner.startAt).toLocaleDateString(locale)} – {new Date(banner.endAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(banner.id)}
                  aria-label={t("edit")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-state-hover hover:text-foreground"
                >
                  <Eye className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  onClick={() => toggleDisabled(banner)}
                  aria-label={banner.status === "disabled" ? t("enable") : t("disable")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-state-hover hover:text-foreground"
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
