"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { BrandMark } from "@/components/BrandMark";

type Mode = "login" | "register" | "forgot";

const TABS: { key: Mode; label: string }[] = [
  { key: "login", label: "Войти" },
  { key: "register", label: "Регистрация" },
  { key: "forgot", label: "Забыли пароль" },
];

type AuthErrorContext = "login" | "register" | "forgot";

function translateAuthError(message: string, context: AuthErrorContext = "login"): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Неверный email или пароль.",
    "Email not confirmed": "Email ещё не подтверждён — проверьте почту и перейдите по ссылке из письма.",
    "User already registered": "Этот email уже зарегистрирован. Войдите в аккаунт или восстановите пароль.",
    "Password should be at least 6 characters": "Пароль должен быть не короче 6 символов.",
  };
  if (known[message]) return known[message];
  if (context === "register") return `Не удалось создать аккаунт: ${message}`;
  if (context === "login") return `Не удалось войти: ${message}`;
  return `Что-то пошло не так: ${message}`;
}

/** Result of a registration attempt, shown instead of silently switching tabs. */
type RegisterResult = { kind: "check-email"; email: string } | { kind: "already-registered" };

// The cart lives in a plain localStorage key, not scoped to an account — a
// brand-new registration on a browser that previously had someone else
// logged in (or an unfinished registration) would otherwise inherit
// whatever was left in that cart.
function clearStaleCart() {
  try {
    localStorage.removeItem("beautyai-cart");
  } catch {
    // недоступно — не критично
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const router = useRouter();

  // An email confirmation (or magic) link lands here with the session in the
  // URL hash, which only the browser client can see — proxy.ts can't read it
  // from a request it never gets fragments on, so a fresh confirmation would
  // otherwise leave the user stuck looking logged-out on this exact page.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearStaleCart();
        router.replace("/");
        router.refresh();
      }
    });
  }, [router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setRegisterResult(null);
    setResendNotice(null);
    setResendError(null);
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
        setError(translateAuthError(signInError.message, "login"));
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
    setRegisterResult(null);

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (signUpError) {
        setError(translateAuthError(signUpError.message, "register"));
        return;
      }

      if (data.session) {
        clearStaleCart();
        router.push("/");
        router.refresh();
        return;
      }

      // Supabase returns success with no error for an email that's already
      // registered (to avoid leaking which emails exist) — the tell is an
      // empty identities array instead of a real error. Without this check
      // we'd wrongly tell an existing user "check your email" every time,
      // with no email actually sent.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setRegisterResult({ kind: "already-registered" });
        return;
      }

      setRegisterResult({ kind: "check-email", email });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!registerResult || registerResult.kind !== "check-email") return;
    setResending(true);
    setResendNotice(null);
    setResendError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: registerResult.email,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (resendErr) {
        setResendError(translateAuthError(resendErr.message, "register"));
        return;
      }
      setResendNotice("Письмо отправлено повторно.");
    } finally {
      setResending(false);
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
        setError(translateAuthError(resetError.message, "forgot"));
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
          <BrandMark size={26} />
        </div>
        <h1 className="font-display text-2xl">ОПТОВЫЕ ЦЕНЫ 01</h1>
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
            className="mt-2 rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>
      )}

      {mode === "register" && registerResult?.kind === "check-email" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3">
            Аккаунт создан. Проверьте почту <span className="font-medium">{registerResult.email}</span> и
            перейдите по ссылке из письма, чтобы подтвердить регистрацию.
          </p>
          {resendNotice && (
            <p className="text-sm bg-accent-soft text-accent rounded-lg px-4 py-3">{resendNotice}</p>
          )}
          {resendError && (
            <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3">{resendError}</p>
          )}
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending}
            className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {resending ? "Отправляем…" : "Отправить письмо ещё раз"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-sm text-accent underline"
          >
            У меня уже есть аккаунт — войти
          </button>
        </div>
      )}

      {mode === "register" && registerResult?.kind === "already-registered" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3">
            Этот email уже зарегистрирован. Войдите в аккаунт или восстановите пароль.
          </p>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="text-sm text-accent underline"
          >
            Забыли пароль?
          </button>
        </div>
      )}

      {mode === "register" && !registerResult && (
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
            className="mt-2 rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Создаём аккаунт…" : "Зарегистрироваться"}
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
            className="mt-2 rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {submitting ? "Отправляем…" : "Отправить ссылку для сброса"}
          </button>
        </form>
      )}
    </div>
  );
}
