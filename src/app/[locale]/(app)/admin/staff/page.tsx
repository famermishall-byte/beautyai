"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPage } from "@/components/admin/AdminPage";
import type { Branch } from "@/types";

type Person = { userId: string; email: string; displayName: string | null; role: string; branchId: string | null; branchName: string | null };
type Notice = { kind: "ok" | "error"; text: string };

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

export default function AdminStaffPage() {
  const t = useTranslations("adminStaff");
  const roleLabel = (role: string) => (["owner", "admin", "branch_manager"].includes(role) ? t(`roles.${role}`) : role);
  const [staff, setStaff] = useState<Person[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("branch_manager");
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error ?? t("loadFailed"));
      setStaff([]);
      return;
    }
    setLoadError("");
    setStaff(data.staff ?? []);
  }

  useEffect(() => {
    // Fetching data on mount — same pattern/rationale as BranchManager.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    fetch("/api/admin/branches")
      .then((res) => res.json())
      .then((data: { branches?: Branch[] }) => {
        const list = [...(data.branches ?? [])].sort((a, b) => a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru"));
        setBranches(list);
      })
      .catch(() => setBranches([]));
  }, []);

  async function call(payload: { email: string; role: string; branchId: string | null }, okText: string) {
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice({ kind: "error", text: data.error ?? t("actionFailed") });
      return false;
    }
    setNotice({ kind: "ok", text: okText });
    await load();
    return true;
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!email.trim()) {
      setNotice({ kind: "error", text: t("enterEmail") });
      return;
    }
    if (role === "branch_manager" && !branchId) {
      setNotice({ kind: "error", text: t("chooseBranch") });
      return;
    }
    setSaving(true);
    const ok = await call({ email: email.trim(), role, branchId: role === "branch_manager" ? branchId : null }, t("granted", { email: email.trim() }));
    setSaving(false);
    if (ok) setEmail("");
  }

  async function handleRemove(p: Person) {
    if (!confirm(t("revokeConfirm", { email: p.email }))) return;
    setNotice(null);
    await call({ email: p.email, role: "user", branchId: null }, t("revoked", { email: p.email }));
  }

  return (
    <AdminPage title={t("title")} subtitle={t("subtitle")}>
      {notice && (
        <div
          role="status"
          className={["rounded-xl px-4 py-3 text-sm font-medium mb-4", notice.kind === "ok" ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}
        >
          {notice.text}
        </div>
      )}

      <form onSubmit={handleAssign} className="bg-card rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-medium mb-1">{t("grantTitle")}</h2>
        <p className="text-sm text-muted mb-4">
          {t("grantHint")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            {t("staffEmail")}
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("role")}
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="branch_manager">{t("roles.branch_manager")}</option>
              <option value="admin">{t("adminAllBranches")}</option>
            </select>
          </label>
          {role === "branch_manager" && (
            <label className="flex flex-col gap-1 text-xs text-muted">
              {t("branch")}
              <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{t("chooseBranchOption")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.city} — {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {saving ? t("granting") : t("grantTitle")}
        </button>
      </form>

      <div className="bg-card rounded-2xl border border-black/5 p-5">
        <h2 className="font-medium mb-3">{t("currentTitle")}{staff ? ` · ${staff.length}` : ""}</h2>
        {loadError && <p className="text-sm text-error font-medium">{loadError}</p>}
        {staff === null ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : staff.length === 0 && !loadError ? (
          <p className="text-sm text-muted">{t("nobody")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {staff.map((p) => (
              <li key={p.userId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.displayName ? `${p.displayName} · ${p.email}` : p.email}</div>
                  <div className="text-xs text-muted">
                    {roleLabel(p.role)}
                    {p.role === "branch_manager" && (p.branchName ? ` · ${p.branchName}` : ` · ${t("noBranchChosen")}`)}
                  </div>
                </div>
                {p.role !== "owner" && (
                  <button onClick={() => handleRemove(p)} className="text-sm text-muted underline hover:text-error transition shrink-0">
                    {t("revoke")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminPage>
  );
}
