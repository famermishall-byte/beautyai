"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ShoppingBag,
  Heart,
  MapPin,
  Store,
  MessageCircle,
  LayoutDashboard,
  Settings,
  LogOut,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { useSession, type Session } from "@/lib/session-context";
import { skinTypeLabel, skinConcernLabel } from "@/lib/skincare";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const { session, loading, isAdmin, signOut, refresh } = useSession();

  const [displayName, setDisplayName] = useState(() => session?.displayName ?? "");
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

  // Keep the editable name field in sync when `session` is (re)loaded (e.g. after
  // `refresh()`), without wiping out what the user is currently typing otherwise.
  // Adjusting state during render (guarded by a "did the source value change?"
  // check) is the React-recommended replacement for a useEffect here — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSessionForName, setPrevSessionForName] = useState<Session | null>(session);
  if (session !== prevSessionForName) {
    setPrevSessionForName(session);
    if (session) setDisplayName(session.displayName ?? "");
  }

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
    "w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent";
  const cardClass = "bg-card rounded-[var(--radius-card)] border border-border p-5 mb-4 shadow-[var(--shadow-card)]";

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">Профиль</h1>
      <p className="text-muted text-sm mb-7">{session?.email}</p>

      <div className={cardClass}>
        <h2 className="font-medium mb-3 text-sm">Имя</h2>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как вас называть?"
            className={inputClass}
          />
          <Button type="submit" size="sm" disabled={nameSubmitting} className="shrink-0">
            {nameSaved ? "Сохранено ✓" : nameSubmitting ? "Сохраняем…" : "Сохранить"}
          </Button>
        </form>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">Моя кожа</h2>
          <Link href="/skin-profile" className="text-sm text-accent font-medium hover:underline">
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

      <div className={cardClass}>
        <h2 className="font-medium mb-3 text-sm">Email</h2>
        {emailNotice && (
          <p className="text-sm bg-accent-soft text-accent-strong rounded-[var(--radius-control)] px-4 py-3 mb-3">
            {emailNotice}
          </p>
        )}
        {emailError && (
          <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3 mb-3">{emailError}</p>
        )}
        <form onSubmit={handleChangeEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="Новый email"
            className={inputClass}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={emailSubmitting || !newEmail.trim()} className="shrink-0">
            {emailSubmitting ? "Отправляем…" : "Изменить"}
          </Button>
        </form>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Пароль</h2>
          {!showPasswordForm && (
            <button type="button" onClick={() => setShowPasswordForm(true)} className="text-sm text-accent font-medium hover:underline">
              Изменить пароль
            </button>
          )}
        </div>

        {showPasswordForm && (
          <>
            {passwordNotice && (
              <p className="text-sm bg-accent-soft text-accent-strong rounded-[var(--radius-control)] px-4 py-3 mt-3">
                {passwordNotice}
              </p>
            )}
            {passwordError && (
              <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3 mt-3">{passwordError}</p>
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
                <Button type="submit" size="sm" disabled={passwordSubmitting || !newPassword}>
                  {passwordSubmitting ? "Сохраняем…" : "Сохранить пароль"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelPasswordForm}>
                  Отмена
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] overflow-hidden mb-6 mt-2">
        <MenuRow href="/orders" icon={ShoppingBag} label="Мои покупки" />
        <MenuRow href="/mybag" icon={Heart} label="Моя косметичка" />
        <MenuRow href="/city" icon={MapPin} label="Мой город" />
        <MenuRow href="/branches" icon={Store} label="Магазины" />
        <MenuRow href="/feedback" icon={MessageCircle} label="Обратная связь" last={!isAdmin} />
        {isAdmin && (
          <>
            <MenuRow href="/admin" icon={LayoutDashboard} label="Админ-панель магазина" />
            <MenuRow href="/admin/settings" icon={Settings} label="Настройки магазина" last />
          </>
        )}
      </div>

      <Button variant="ghost" size="lg" fullWidth onClick={handleSignOut}>
        <LogOut className="size-4.5" strokeWidth={1.85} aria-hidden />
        Выйти
      </Button>

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full text-center text-xs text-muted underline mt-6 transition hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        Удалить аккаунт
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm bg-background rounded-[var(--radius-card)] shadow-xl p-6 animate-rise-in">
            <h2 className="font-display text-xl mb-3">Удалить аккаунт?</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Вы уверены, что хотите удалить аккаунт? Все сохранённые данные, информация о коже,
              косметичка и история покупок будут удалены без возможности восстановления.
            </p>
            {deleteError && <p className="text-sm text-error mb-4">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                Отмена
              </Button>
              <Button variant="danger" className="flex-1" disabled={deleting} onClick={handleDeleteAccount}>
                {deleting ? "Удаляем…" : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  last = false,
}: {
  href: string;
  icon: typeof ShoppingBag;
  label: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3.5 px-5 py-4 transition hover:bg-black/[0.02] active:bg-black/[0.04]",
        !last ? "border-b border-border" : "",
      ].join(" ")}
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
        <Icon className="size-4.5" strokeWidth={1.85} aria-hidden />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted" strokeWidth={2} aria-hidden />
    </Link>
  );
}
