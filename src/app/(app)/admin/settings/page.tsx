"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session-context";

const TRANSFER_ERRORS: Record<string, string> = {
  not_owner: "Только владелец магазина может передать права.",
  target_not_registered:
    "Этот email ещё не зарегистрирован. Новый владелец должен сначала создать аккаунт на странице входа (вкладка «Регистрация»), а затем сообщить вам свой email.",
  cannot_transfer_to_self: "Нельзя передать права самому себе.",
  not_authenticated: "Сессия истекла — войдите заново.",
};

export default function AdminSettingsPage() {
  const { session, isOwner, signOut } = useSession();
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [transferEmail, setTransferEmail] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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

  async function handleTransferOwnership(e: FormEvent) {
    e.preventDefault();
    setTransferError(null);
    if (!transferEmail.trim()) return;

    if (
      !confirm(
        `Передать права владельца магазина «${session?.storeName}» пользователю ${transferEmail.trim()}? Вы потеряете доступ к этому магазину.`
      )
    ) {
      return;
    }

    setTransferSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.rpc("transfer_store_ownership", {
        new_owner_email: transferEmail.trim(),
      });
      if (error) {
        setTransferError(TRANSFER_ERRORS[error.message] ?? `Не удалось передать права: ${error.message}`);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setTransferSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <Link href="/admin" className="text-sm text-accent underline mb-4 inline-block">
        ← Назад в панель магазина
      </Link>
      <h1 className="font-display text-3xl mb-2">Настройки аккаунта</h1>
      <p className="text-muted mb-8">
        Вы вошли как <span className="font-medium text-foreground">{session?.email}</span> (
        {isOwner ? "владелец" : session?.role === "branch_manager" ? "управляющий филиала" : "администратор"} магазина «{session?.storeName}»)
      </p>

      <button
        onClick={() => signOut()}
        className="mb-6 rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Выйти
      </button>

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
            {emailSubmitting ? "Отправляем…" : "Изменить email"}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="font-medium mb-3">Пароль</h2>
        {passwordNotice && (
          <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3 mb-3">{passwordNotice}</p>
        )}
        {passwordError && (
          <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-3">{passwordError}</p>
        )}
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Новый пароль (минимум 6 символов)"
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Повторите пароль"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={passwordSubmitting || !newPassword}
            className="self-start rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {passwordSubmitting ? "Сохраняем…" : "Изменить пароль"}
          </button>
        </form>
      </div>

      {isOwner && (
        <div className="bg-card rounded-2xl border border-black/5 p-6">
          <h2 className="font-medium mb-1">Передать права владельца</h2>
          <p className="text-sm text-muted mb-4">
            Например, при продаже магазина новому хозяину. Новый владелец должен сначала
            зарегистрироваться на странице входа (это не обязательно должен быть тот же email) —
            после этого укажите здесь его email. Вы потеряете доступ к этому магазину сразу после
            передачи.
          </p>
          {transferError && (
            <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-3">{transferError}</p>
          )}
          <form onSubmit={handleTransferOwnership} className="flex gap-2">
            <input
              type="email"
              placeholder="Email нового владельца"
              className={inputClass}
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={transferSubmitting || !transferEmail.trim()}
              className="shrink-0 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            >
              {transferSubmitting ? "Передаём…" : "Передать права"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
