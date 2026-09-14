"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

type Mode = "login" | "register" | "forgot";

const TABS: { key: Mode; label: string }[] = [
  { key: "login", label: "Войти" },
  { key: "register", label: "Регистрация" },
  { key: "forgot", label: "Забыли пароль" },
];

function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Неверный email или пароль.",
    "Email not confirmed": "Email ещё не подтверждён — проверьте почту и перейдите по ссылке из письма.",
    "User already registered": "Пользователь с таким email уже зарегистрирован.",
    "Password should be at least 6 characters": "Пароль должен быть не короче 6 символов.",
  };
  return known[message] ?? `Что-то пошло не так: ${message}`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const router = useRouter();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(translateAuthError(signInError.message));
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setNotice(
        `Мы отправили письмо для подтверждения на ${email}. Перейдите по ссылке из письма, затем войдите.`
      );
      setMode("login");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(translateAuthError(resetError.message));
        return;
      }
      setNotice("Если такой email зарегистрирован, мы отправили на него ссылку для сброса пароля.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-black/10 bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <div className="bg-card rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8">
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-display text-white">
          B
        </div>
        <h1 className="font-display text-2xl">BeautyAI</h1>
        <p className="text-muted text-sm mt-1">Вход в личный кабинет магазина</p>
      </div>

      <div className="flex bg-accent-soft/60 rounded-full p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchMode(tab.key)}
            className={[
              "flex-1 rounded-full py-2 text-sm font-medium transition",
              mode === tab.key ? "bg-white shadow-sm text-foreground" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3 mb-4">{notice}</p>
      )}
      {error && (
        <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-4">{error}</p>
      )}

      {mode === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordInput
            required
            placeholder="Пароль"
            className={inputClass}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-foreground text-background px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordInput
            required
            placeholder="Пароль (минимум 6 символов)"
            className={inputClass}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordInput
            required
            placeholder="Повторите пароль"
            className={inputClass}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-foreground text-background px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Регистрируем…" : "Зарегистрироваться"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-foreground text-background px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Отправляем…" : "Отправить ссылку для сброса"}
          </button>
        </form>
      )}
    </div>
  );
}
