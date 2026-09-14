"use client";

import { useEffect, useState } from "react";
import type { Branch } from "@/types";

const EMPTY_FORM = { name: "", address: "", phone: "", whatsapp: "", hours: "" };

function BranchRow({ branch, onSaved, onDeleted }: { branch: Branch; onSaved: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    whatsapp: branch.whatsapp,
    hours: branch.hours,
  });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Удалить филиал "${branch.name}"?`)) return;
    await fetch(`/api/admin/branches/${branch.id}`, { method: "DELETE" });
    onDeleted();
  }

  const inputClass =
    "rounded-lg border border-black/10 bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <div className="border border-black/5 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Название
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Адрес
        <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Телефон
        <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        WhatsApp номер
        <input
          className={inputClass}
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="+996700000000"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
        Часы работы
        <input className={inputClass} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {savedFlash ? "Сохранено ✓" : saving ? "Сохраняю…" : "Сохранить"}
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-muted underline hover:text-accent transition"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

export function BranchManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/branches");
    const data = await res.json();
    setBranches(data.branches ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.address || !form.phone || !form.whatsapp || !form.hours) {
      setError("Заполните все поля, чтобы добавить филиал.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось добавить филиал.");
      } else {
        setForm(EMPTY_FORM);
        await load();
      }
    } finally {
      setAdding(false);
    }
  }

  const inputClass =
    "rounded-lg border border-black/10 bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <div className="bg-card rounded-2xl border border-black/5 p-6">
      <h2 className="font-medium mb-1">Филиалы</h2>
      <p className="text-sm text-muted mb-4">
        Покупатель выбирает один из этих филиалов при оформлении заказа — заказ уходит на его WhatsApp-номер.
      </p>

      {branches.length === 0 ? (
        <p className="text-muted text-sm mb-4">Филиалов пока нет — добавьте хотя бы один ниже.</p>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {branches.map((branch) => (
            <BranchRow key={branch.id} branch={branch} onSaved={load} onDeleted={load} />
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="border-t border-black/10 pt-4">
        <h3 className="text-sm font-medium mb-3">Добавить новый филиал</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={inputClass}
            placeholder="Название"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Адрес"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Телефон"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="WhatsApp номер, напр. +996700000000"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
          <input
            className={`${inputClass} sm:col-span-2`}
            placeholder="Часы работы"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          type="submit"
          disabled={adding}
          className="mt-3 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {adding ? "Добавляю…" : "Добавить филиал"}
        </button>
      </form>
    </div>
  );
}
