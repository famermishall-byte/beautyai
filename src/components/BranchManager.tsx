"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { Branch } from "@/types";

type Form = { name: string; city: string; address: string; phone: string; whatsapp: string; hours: string; latitude: string; longitude: string };
type Notice = { kind: "ok" | "error"; text: string };

const EMPTY_FORM: Form = { name: "", city: "", address: "", phone: "", whatsapp: "", hours: "", latitude: "", longitude: "" };

// (field names are shown from messages: branchManager.fields.<key>)
const REQUIRED: { key: keyof Form }[] = [
  { key: "name" },
  { key: "city" },
  { key: "address" },
  { key: "phone" },
  { key: "whatsapp" },
  { key: "hours" },
];

function toForm(b: Branch): Form {
  return {
    name: b.name,
    city: b.city,
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp,
    hours: b.hours,
    latitude: b.latitude === null ? "" : String(b.latitude),
    longitude: b.longitude === null ? "" : String(b.longitude),
  };
}

function missingFields(form: Form) {
  return REQUIRED.filter((f) => !form[f.key].trim());
}

const inputClass = "rounded-control border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

function nowLabel(locale: string) {
  return new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function BranchCard({
  branch,
  open,
  onToggle,
  onSaved,
  onDeleted,
  notify,
}: {
  branch: Branch;
  open: boolean;
  onToggle: () => void;
  onSaved: (b: Branch) => void;
  onDeleted: (id: string) => void;
  notify: (n: Notice) => void;
}) {
  const t = useTranslations("branchManager");
  const locale = useLocale();
  const [form, setForm] = useState<Form>(toForm(branch));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const saved = toForm(branch);
  const dirty = (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== saved[k]);
  const missing = missingFields(form);

  function edit(patch: Partial<Form>) {
    setForm({ ...form, ...patch });
    if (state !== "saving") setState("idle");
  }

  async function handleSave() {
    if (missing.length > 0) {
      setState("error");
      setMessage(t("missing", { fields: missing.map((m) => t(`fields.${m.key}`)).join(", ") }));
      return;
    }
    setState("saving");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? t("saveFailed"));
        return;
      }
      setState("saved");
      setMessage(t("savedAt", { time: nowLabel(locale) }));
      setForm(toForm(data.branch as Branch)); // normalised by the server (e.g. "42,87" → "42.87")
      onSaved(data.branch as Branch);
      notify({ kind: "ok", text: t("savedNotice", { name: form.name }) });
    } catch {
      setState("error");
      setMessage(t("offline"));
    }
  }

  async function handleDelete() {
    if (!confirm(t("deleteConfirm", { name: branch.name }))) return;
    const res = await fetch(`/api/admin/branches/${branch.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(branch.id);
      notify({ kind: "ok", text: t("deletedNotice", { name: branch.name }) });
    } else {
      notify({ kind: "error", text: t("deleteFailed") });
    }
  }

  return (
    <div id={`branch-${branch.id}`} className="border border-border rounded-control overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-state-hover transition" aria-expanded={open}>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{branch.name}</div>
          <div className="text-xs text-muted truncate">
            {branch.address} · {branch.phone}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {open && dirty && <span className="text-2xs font-medium text-warning bg-warning-soft rounded-full px-2 py-0.5">{t("unsaved")}</span>}
          <ChevronDown className={["size-4 text-muted transition-transform", open ? "rotate-180" : ""].join(" ")} aria-hidden />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.name")}
            <input className={inputClass} value={form.name} onChange={(e) => edit({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.city")}
            <input className={inputClass} value={form.city} onChange={(e) => edit({ city: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.address")}
            <input className={inputClass} value={form.address} onChange={(e) => edit({ address: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.phone")}
            <input className={inputClass} value={form.phone} onChange={(e) => edit({ phone: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.whatsapp")}
            <input className={inputClass} value={form.whatsapp} onChange={(e) => edit({ whatsapp: e.target.value })} placeholder="+996700000000" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.hours")}
            <input className={inputClass} value={form.hours} onChange={(e) => edit({ hours: e.target.value })} placeholder="10:00–20:00" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.latitude")}
            <input className={inputClass} value={form.latitude} onChange={(e) => edit({ latitude: e.target.value })} placeholder="42.8746" inputMode="decimal" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("fields.longitude")}
            <input className={inputClass} value={form.longitude} onChange={(e) => edit({ longitude: e.target.value })} placeholder="74.5698" inputMode="decimal" />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={state === "saving" || !dirty}
              className="rounded-full bg-accent text-on-accent px-5 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {state === "saving" ? t("saving") : t("save")}
            </button>
            <button onClick={handleDelete} className="text-sm text-muted underline hover:text-accent transition">
              {t("deleteBranch")}
            </button>
            <span aria-live="polite" className="text-sm">
              {state === "saved" && !dirty && <span className="text-success font-medium">✓ {message}</span>}
              {state === "error" && <span className="text-error font-medium">{message}</span>}
              {state === "idle" && !dirty && <span className="text-muted">{t("noChanges")}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BranchManager() {
  const t = useTranslations("branchManager");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/branches");
    const data = await res.json();
    setBranches(data.branches ?? []);
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function notify(n: Notice) {
    setNotice(n);
    if (n.kind === "ok") setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 5000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const missing = missingFields(form);
    if (missing.length > 0) {
      setAddError(t("missing", { fields: missing.map((m) => t(`fields.${m.key}`)).join(", ") }));
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error ?? t("addFailed"));
        return;
      }
      const created = data.branch as Branch;
      setBranches((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      setOpenId(created.id);
      notify({ kind: "ok", text: t("addedNotice", { name: created.name }) });
      setTimeout(() => document.getElementById(`branch-${created.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } catch {
      setAddError(t("addOffline"));
    } finally {
      setAdding(false);
    }
  }

  // By city, then by name — with 15 branches a flat list in creation order is hard to scan.
  const byCity = new Map<string, Branch[]>();
  for (const b of [...branches].sort((a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru"))) {
    byCity.set(b.city, [...(byCity.get(b.city) ?? []), b]);
  }

  return (
    <div className="bg-card rounded-card border border-border p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-medium">{t("title")} · {branches.length}</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-accent-soft text-accent px-3.5 py-1.5 text-sm font-medium transition hover:bg-accent hover:text-on-accent"
        >
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </button>
      </div>
      <p className="text-sm text-muted mb-4">
        {t("intro")}
      </p>

      {notice && (
        <div
          role="status"
          className={["rounded-control px-4 py-3 text-sm font-medium mb-4", notice.kind === "ok" ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}
        >
          {notice.text}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="border border-accent/30 bg-accent-soft/40 rounded-control p-4 mb-5">
          <h3 className="text-sm font-medium mb-3">{t("newBranch")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputClass} placeholder={t("fields.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder={t("fields.city")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className={inputClass} placeholder={t("fields.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className={inputClass} placeholder={t("fields.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={inputClass} placeholder={t("placeholders.whatsapp")} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <input className={inputClass} placeholder={t("fields.hours")} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <input className={inputClass} placeholder={t("placeholders.latitude")} value={form.latitude} inputMode="decimal" onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <input className={inputClass} placeholder={t("placeholders.longitude")} value={form.longitude} inputMode="decimal" onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          </div>
          {addError && <p className="text-sm text-error font-medium mt-3">{addError}</p>}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="submit"
              disabled={adding}
              className="rounded-full bg-accent text-on-accent px-5 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {adding ? t("adding") : t("addBranch")}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-muted underline">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {branches.length === 0 ? (
        <p className="text-muted text-sm">{t("none")}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {[...byCity.entries()].map(([city, list]) => (
            <div key={city}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                {city} · {list.length}
              </div>
              <div className="flex flex-col gap-2">
                {list.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    open={openId === branch.id}
                    onToggle={() => setOpenId(openId === branch.id ? null : branch.id)}
                    onSaved={(b) => setBranches((prev) => prev.map((x) => (x.id === b.id ? b : x)))}
                    onDeleted={(id) => setBranches((prev) => prev.filter((x) => x.id !== id))}
                    notify={notify}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
