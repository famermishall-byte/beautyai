"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { ProductPicker, type PickedProduct } from "@/components/ProductPicker";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { usePrice } from "@/lib/use-price";
import { effectiveState, type EffectiveState } from "@/lib/promo-status";
import type { Promotion } from "@/types";

type DiscountType = "percent" | "fixed" | "special_price";

type FormState = {
  title: string;
  product: PickedProduct | null;
  discountType: DiscountType;
  discountValue: string;
  showOldPrice: boolean;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "disabled";
};

const EMPTY_FORM: FormState = {
  title: "",
  product: null,
  discountType: "percent",
  discountValue: "",
  showOldPrice: true,
  startAt: "",
  endAt: "",
  status: "draft",
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function promotionToForm(p: Promotion): FormState {
  return {
    title: p.title,
    product: p.product ? { id: p.product.id, name: p.product.name, brand: p.product.brand, imageUrl: p.product.imageUrl, price: p.product.price } : null,
    discountType: p.discountType,
    discountValue: p.discountType === "special_price" ? String(p.newPrice) : String(p.discountValue ?? ""),
    showOldPrice: p.showOldPrice,
    startAt: toDatetimeLocal(p.startAt),
    endAt: toDatetimeLocal(p.endAt),
    status: p.status,
  };
}

function computePreview(basePrice: number | undefined, type: DiscountType, value: string): { oldPrice: number; newPrice: number } | null {
  if (basePrice === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (type === "percent") return { oldPrice: basePrice, newPrice: Math.round(basePrice * (1 - n / 100)) };
  if (type === "fixed") return { oldPrice: basePrice, newPrice: Math.max(0, basePrice - n) };
  return { oldPrice: basePrice, newPrice: n };
}

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

const STATE_LABEL_KEY: Record<EffectiveState, string> = {
  draft: "draft",
  scheduled: "scheduled",
  active: "active",
  expired: "expired",
  disabled: "disabled",
};

function PromotionForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FormState;
  onCancel: () => void;
  onSaved: (form: FormState) => Promise<void>;
}) {
  const t = useTranslations("promotionManager");
  const price = usePrice();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = computePreview(form.product?.price, form.discountType, form.discountValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.product || !form.startAt || !form.endAt || !form.discountValue) {
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

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3.5 mb-5">
      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.product")}</div>
        <ProductPicker picked={form.product} onPick={(product) => setForm({ ...form, product })} />
      </div>

      <input className={inputClass} placeholder={t("fields.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.discountType")}</div>
        <div className="flex gap-2">
          {(["percent", "fixed", "special_price"] as DiscountType[]).map((type) => (
            <Chip key={type} label={t(`discountType.${type}`)} active={form.discountType === type} onClick={() => setForm({ ...form, discountType: type, showOldPrice: type !== "special_price" })} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">{t(`discountValueLabel.${form.discountType}`)}</div>
        <input
          type="number"
          className={inputClass}
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
        />
      </div>

      {preview && (
        <div className="text-sm bg-accent-soft text-accent-strong rounded-lg px-3.5 py-2.5">
          {t("previewLine", {
            old: price(preview.oldPrice),
            new: price(preview.newPrice),
            percent: preview.oldPrice > 0 ? Math.round((1 - preview.newPrice / preview.oldPrice) * 100) : 0,
          })}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.showOldPrice} onChange={(e) => setForm({ ...form, showOldPrice: e.target.checked })} className="size-4 accent-accent" />
        {t("fields.showOldPrice")}
      </label>

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

      <div>
        <div className="text-xs text-muted mb-1.5">{t("fields.status")}</div>
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
          <option value="draft">{t("status.draft")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="disabled">{t("status.disabled")}</option>
        </select>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

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

export function PromotionManager() {
  const t = useTranslations("promotionManager");
  const locale = useLocale();
  const price = usePrice();
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "expired">("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/promotions")
      .then((res) => res.json())
      .then((data: { promotions?: Promotion[] }) => setPromotions(data.promotions ?? []))
      .catch(() => setPromotions([]));
  }

  useEffect(load, []);

  const filtered = (promotions ?? []).filter((p) => filter === "all" || effectiveState(p) === filter);

  async function submitForm(id: string | null, form: FormState) {
    const body = {
      title: form.title,
      productId: form.product?.id,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      showOldPrice: form.showOldPrice,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      status: form.status,
    };
    const res = await fetch(id ? `/api/admin/promotions/${id}` : "/api/admin/promotions", {
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
    const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("deleteFailed"));
      return;
    }
    load();
  }

  async function toggleDisabled(promotion: Promotion) {
    setError(null);
    const res = await fetch(`/api/admin/promotions/${promotion.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: promotion.title,
        productId: promotion.productId,
        discountType: promotion.discountType,
        discountValue: promotion.discountType === "special_price" ? promotion.newPrice : promotion.discountValue,
        showOldPrice: promotion.showOldPrice,
        startAt: promotion.startAt,
        endAt: promotion.endAt,
        status: promotion.status === "disabled" ? "active" : "disabled",
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

      {creating && <PromotionForm initial={EMPTY_FORM} onCancel={() => setCreating(false)} onSaved={(form) => submitForm(null, form)} />}

      {error && <p className="text-sm text-error mb-3">{error}</p>}

      {promotions === null && <p className="text-muted text-sm">{t("loading")}</p>}
      {promotions !== null && filtered.length === 0 && <p className="text-muted text-sm">{t("empty")}</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((promotion) =>
          editingId === promotion.id ? (
            <PromotionForm
              key={promotion.id}
              initial={promotionToForm(promotion)}
              onCancel={() => setEditingId(null)}
              onSaved={(form) => submitForm(promotion.id, form)}
            />
          ) : (
            <div key={promotion.id} className="bg-card rounded-2xl border border-black/5 p-4 flex gap-3.5 items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-soft shrink-0">
                {promotion.product?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={promotion.product.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{promotion.title}</div>
                <div className="text-xs text-muted truncate">{promotion.product?.name ?? t("noProduct")}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] rounded-full bg-accent-soft text-accent px-2 py-0.5">
                    {t(`status.${STATE_LABEL_KEY[effectiveState(promotion)]}`)}
                  </span>
                  <span className="text-[11px] text-muted line-through">{price(promotion.oldPrice)}</span>
                  <span className="text-[11px] font-medium text-accent">{price(promotion.newPrice)}</span>
                  <span className="text-[11px] text-muted">
                    {new Date(promotion.startAt).toLocaleDateString(locale)} – {new Date(promotion.endAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(promotion.id)}
                  aria-label={t("edit")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  onClick={() => toggleDisabled(promotion)}
                  aria-label={promotion.status === "disabled" ? t("enable") : t("disable")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 hover:text-foreground"
                >
                  {promotion.status === "disabled" ? <Play className="size-4" strokeWidth={2} aria-hidden /> : <Pause className="size-4" strokeWidth={2} aria-hidden />}
                </button>
                <button
                  onClick={() => handleDelete(promotion.id)}
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
