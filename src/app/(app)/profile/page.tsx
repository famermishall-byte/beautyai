"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { useSession } from "@/lib/session-context";
import { skinTypeLabel, skinConcernLabel } from "@/lib/skincare";

export default function ProfilePage() {
  const { session, loading, isAdmin, signOut, refresh } = useSession();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (session) setDisplayName(session.displayName ?? "");
  }, [session]);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameSubmitting(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      await refresh();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    } finally {
      setNameSubmitting(false);
    }
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailNotice(null);
    setEmailError(null);
    if (!newEmail.trim()) return;

    setEmailSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        setEmailError(`Не удалось изменить email: ${error.message}`);
        return;
      }
      setEmailNotice(
        `Мы отправили письмо для подтверждения на ${newEmail.trim()}. Email изменится после перехода по ссылке из письма.`
      );
      setNewEmail("");
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(`Не удалось изменить пароль: ${error.message}`);
        return;
      }
      setPasswordNotice("Пароль обновлён.");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  function handleCancelPasswordForm() {
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNotice(null);
    setPasswordError(null);
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Не удалось удалить аккаунт.");
        return;
      }
      try {
        localStorage.removeItem("beautyai-orders");
        localStorage.removeItem("beautyai-cart");
      } catch {
        // недоступно — не критично, аккаунт всё равно удалён
      }
      await signOut();
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="text-muted animate-pulse">Загружаем…</p>
      </main>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Профиль</h1>
      <p className="text-muted mb-8">{session?.email}</p>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="font-medium mb-3">Имя</h2>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как вас называть?"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={nameSubmitting}
            className="shrink-0 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {nameSaved ? "Сохранено ✓" : nameSubmitting ? "Сохраняем…" : "Сохранить"}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Моя кожа</h2>
          <Link href="/skin-profile" className="text-sm text-accent underline">
            Изменить
          </Link>
        </div>
        <p className="text-sm text-muted mb-1">
          Тип кожи: <span className="text-foreground">{skinTypeLabel(session?.skinType ?? null) ?? "не указан"}</span>
        </p>
        <p className="text-sm text-muted">
          Проблемы:{" "}
          <span className="text-foreground">
            {session?.skinConcerns && session.skinConcerns.length > 0
              ? session.skinConcerns.map(skinConcernLabel).join(", ")
              : "не указаны"}
          </span>
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="font-medium mb-3">Email</h2>
        {emailNotice && (
          <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3 mb-3">{emailNotice}</p>
        )}
        {emailError && (
          <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-3">{emailError}</p>
        )}
        <form onSubmit={handleChangeEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="Новый email"
            className={inputClass}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={emailSubmitting || !newEmail.trim()}
            className="shrink-0 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {emailSubmitting ? "Отправляем…" : "Изменить"}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Пароль</h2>
          {!showPasswordForm && (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="text-sm text-accent underline"
            >
              Изменить пароль
            </button>
          )}
        </div>

        {showPasswordForm && (
          <>
            {passwordNotice && (
              <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3 mt-3">{passwordNotice}</p>
            )}
            {passwordError && (
              <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mt-3">{passwordError}</p>
            )}
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3 mt-3">
              <PasswordInput
                placeholder="Новый пароль (минимум 6 символов)"
                className={inputClass}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <PasswordInput
                placeholder="Повторите пароль"
                className={inputClass}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting || !newPassword}
                  className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                >
                  {passwordSubmitting ? "Сохраняем…" : "Сохранить пароль"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPasswordForm}
                  className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5"
                >
                  Отмена
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <Link href="/orders" className="text-sm text-accent underline">
          Мои покупки
        </Link>
        {isAdmin && (
          <>
            <Link href="/admin" className="text-sm text-accent underline">
              Админ-панель магазина
            </Link>
            <Link href="/admin/settings" className="text-sm text-accent underline">
              Настройки магазина
            </Link>
          </>
        )}
      </div>

      <button
        onClick={handleSignOut}
        className="w-full rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Выйти
      </button>

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full text-center text-xs text-muted underline mt-6 transition hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        Удалить аккаунт
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-background rounded-2xl shadow-xl p-6">
            <h2 className="font-display text-xl mb-3">Удалить аккаунт?</h2>
            <p className="text-sm text-muted mb-6">
              Вы уверены, что хотите удалить аккаунт? Все сохранённые данные, информация о коже,
              косметичка и история покупок будут удалены без возможности восстановления.
            </p>
            {deleteError && <p className="text-sm text-red-600 mb-4">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 text-white px-4 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {deleting ? "Удаляем…" : "Удалить аккаунт"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
