"use client";

import { useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import type { Branch } from "@/types";

type Person = { userId: string; email: string; displayName: string | null; role: string; branchId: string | null; branchName: string | null };
type Notice = { kind: "ok" | "error"; text: string };

const ROLE_LABELS: Record<string, string> = { owner: "Владелец", admin: "Администратор магазина", branch_manager: "Управляющий филиала" };

const inputClass = "w-full rounded-lg border border-black/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

export default function AdminStaffPage() {
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
      setLoadError(data.error ?? "Не удалось загрузить сотрудников.");
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
      setNotice({ kind: "error", text: data.error ?? "Не удалось выполнить действие." });
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
      setNotice({ kind: "error", text: "Введите почту сотрудника." });
      return;
    }
    if (role === "branch_manager" && !branchId) {
      setNotice({ kind: "error", text: "Выберите филиал для управляющего." });
      return;
    }
    setSaving(true);
    const ok = await call({ email: email.trim(), role, branchId: role === "branch_manager" ? branchId : null }, `Доступ выдан: ${email.trim()} ✓`);
    setSaving(false);
    if (ok) setEmail("");
  }

  async function handleRemove(p: Person) {
    if (!confirm(`Снять доступ у ${p.email}? Он станет обычным покупателем.`)) return;
    setNotice(null);
    await call({ email: p.email, role: "user", branchId: null }, `Доступ снят: ${p.email}`);
  }

  return (
    <AdminPage title="Сотрудники" subtitle="Кто работает с приложением. Управляющий филиала видит только остатки и заказы своего филиала.">
      {notice && (
        <div
          role="status"
          className={["rounded-xl px-4 py-3 text-sm font-medium mb-4", notice.kind === "ok" ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}
        >
          {notice.text}
        </div>
      )}

      <form onSubmit={handleAssign} className="bg-card rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-medium mb-1">Выдать доступ</h2>
        <p className="text-sm text-muted mb-4">
          Человек должен сначала сам зарегистрироваться в приложении со своей почтой. Потом впишите здесь эту же почту — буква в букву.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            Почта сотрудника
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Роль
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="branch_manager">Управляющий филиала</option>
              <option value="admin">Администратор магазина (все филиалы)</option>
            </select>
          </label>
          {role === "branch_manager" && (
            <label className="flex flex-col gap-1 text-xs text-muted">
              Филиал
              <select className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">— выберите филиал —</option>
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
          {saving ? "Выдаём…" : "Выдать доступ"}
        </button>
      </form>

      <div className="bg-card rounded-2xl border border-black/5 p-5">
        <h2 className="font-medium mb-3">Сейчас имеют доступ{staff ? ` · ${staff.length}` : ""}</h2>
        {loadError && <p className="text-sm text-error font-medium">{loadError}</p>}
        {staff === null ? (
          <p className="text-sm text-muted">Загружаем…</p>
        ) : staff.length === 0 && !loadError ? (
          <p className="text-sm text-muted">Пока никого, кроме вас.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {staff.map((p) => (
              <li key={p.userId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.displayName ? `${p.displayName} · ${p.email}` : p.email}</div>
                  <div className="text-xs text-muted">
                    {ROLE_LABELS[p.role] ?? p.role}
                    {p.role === "branch_manager" && (p.branchName ? ` · ${p.branchName}` : " · филиал не выбран")}
                  </div>
                </div>
                {p.role !== "owner" && (
                  <button onClick={() => handleRemove(p)} className="text-sm text-muted underline hover:text-error transition shrink-0">
                    Снять доступ
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
