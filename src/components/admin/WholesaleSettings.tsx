"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { thresholdSom, type WholesaleMode, type WholesaleSettings as Settings } from "@/lib/wholesale";

const MODES: WholesaleMode[] = ["off", "percent", "per_product"];
const MODE_LABEL: Record<WholesaleMode, string> = { off: "modeOff", percent: "modePercent", per_product: "modePerProduct" };

const inputClass =
  "w-full rounded-lg border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

const toNumber = (v: string): number | null => {
  const n = Number(v.replace(",", ".").replace(/\s/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
};

/**
 * «Оптовые цены» в разделе «Магазин»: способ (выкл / % на всё / своя цена у товара из Excel), порог в $ и курс
 * доллара. Сохраняет PUT /api/admin/wholesale (проверки — на сервере, его ошибка показывается как есть).
 */
export function WholesaleSettings() {
  const t = useTranslations("adminWholesale");
  const price = usePrice();
  const [mode, setMode] = useState<WholesaleMode>("off");
  const [percent, setPercent] = useState("");
  const [thresholdUsd, setThresholdUsd] = useState("1000");
  const [usdRate, setUsdRate] = useState("");
  const [missing, setMissing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    fetch("/api/wholesale")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings: Settings } | null) => {
        if (!data) return;
        setMode(data.settings.mode);
        setPercent(data.settings.percent?.toString() ?? "");
        setThresholdUsd(data.settings.thresholdUsd.toString());
        setUsdRate(data.settings.usdRate?.toString() ?? "");
      })
      .catch(() => {});
    fetch("/api/admin/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: { wholesalePrice?: number | null }[] } | null) => {
        if (data?.products) setMissing(data.products.filter((p) => !p.wholesalePrice).length);
      })
      .catch(() => {});
  }, []);

  const preview = thresholdSom({ mode, percent: toNumber(percent), thresholdUsd: toNumber(thresholdUsd) ?? 0, usdRate: toNumber(usdRate) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/wholesale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, percent: toNumber(percent), thresholdUsd: toNumber(thresholdUsd), usdRate: toNumber(usdRate) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-card rounded-2xl border border-black/5 p-6 mt-4 flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl mb-1">{t("title")}</h2>
        <p className="text-sm text-muted">{t("hint")}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        {MODES.map((m) => (
          <label key={m} className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="radio" name="wholesale-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-0.5 accent-[var(--accent)]" />
            {t(MODE_LABEL[m])}
          </label>
        ))}
      </fieldset>

      {mode !== "off" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mode === "percent" && (
            <label className="text-sm">
              <span className="block text-xs font-medium text-muted mb-1.5">{t("percent")}</span>
              <input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} className={inputClass} />
            </label>
          )}
          <label className="text-sm">
            <span className="block text-xs font-medium text-muted mb-1.5">{t("thresholdUsd")}</span>
            <input inputMode="decimal" value={thresholdUsd} onChange={(e) => setThresholdUsd(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-medium text-muted mb-1.5">{t("usdRate")}</span>
            <input inputMode="decimal" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className={inputClass} />
          </label>
        </div>
      )}

      {mode !== "off" && preview !== null && <p className="text-sm font-medium">{t("equals", { amount: price(preview) })}</p>}
      {mode === "per_product" && missing !== null && missing > 0 && (
        <p className="rounded-xl bg-warning-soft text-warning text-sm px-4 py-3">{t("missing", { n: missing })}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("save")}
        </button>
        <span aria-live="polite" className="text-sm">
          {saved && <span className="text-success font-medium">✓ {t("saved")}</span>}
          {error && <span className="text-error font-medium">{error}</span>}
        </span>
      </div>
    </form>
  );
}
