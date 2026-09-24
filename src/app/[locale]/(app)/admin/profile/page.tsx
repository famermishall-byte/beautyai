"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";

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
      <div className="bg-card rounded-card border border-border p-6">
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              setSaved(false);
            }}
            placeholder={t("namePlaceholder")}
            className="flex-1 min-w-[12rem] rounded-control border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={saving || !storeName.trim()}
            className="rounded-full bg-accent text-on-accent px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {saving ? t("saving") : t("save")}
          </button>
          <span aria-live="polite" className="text-sm">
            {saved && <span className="text-success font-medium">✓ {t("saved")}</span>}
            {error && <span className="text-error font-medium">{error}</span>}
          </span>
        </form>
      </div>
    </AdminPage>
  );
}
