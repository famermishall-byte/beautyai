"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";

import { buttonClasses } from "@/components/ui/Button";
import { Check } from "lucide-react";
export default function AdminProfilePage() {
  const t = useTranslations("adminProfile");
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    fetch("/api/admin/catalog")
      .then((res) => res.json())
      .then((data: { storeName?: string }) => setStoreName(data.storeName ?? ""))
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: storeName.trim() }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("saveFailed"));
      }
    } catch {
      setError(t("offline"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      <div className="surface-card p-6">
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              setSaved(false);
            }}
            placeholder={t("namePlaceholder")}
            className="field flex-1 min-w-[12rem]"
          />
          <button
            type="submit"
            disabled={saving || !storeName.trim()}
            className={buttonClasses({ size: "sm" })}
          >
            {saving ? t("saving") : t("save")}
          </button>
          <span aria-live="polite" className="text-sm">
            {saved && <span className="inline-flex items-center gap-1 text-success font-medium"><Check className="size-4" strokeWidth={2.5} aria-hidden />{t("saved")}</span>}
            {error && <span className="text-error font-medium">{error}</span>}
          </span>
        </form>
      </div>
    </AdminPage>
  );
}
