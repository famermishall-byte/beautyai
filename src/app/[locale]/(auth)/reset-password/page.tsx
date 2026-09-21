"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { Link, useRouter } from "@/i18n/navigation";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const [ready, setReady] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    // The recovery link from the email establishes a temporary session via
    // the URL fragment — the browser client picks it up automatically.
    supabase.auth.getSession().then(({ data }) => {
      setHasValidSession(!!data.session);
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("passwordShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(t("saveFailed", { message: updateError.message }));
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-black/10 bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-accent";

  if (!ready) {
    return (
      <div className="bg-card rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8 text-center">
        <p className="text-muted animate-pulse">{t("checking")}</p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="bg-card rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8 text-center">
        <h1 className="font-display text-2xl mb-3">{t("invalidTitle")}</h1>
        <p className="text-muted mb-6">
          {t("invalidText")}
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-card rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8 text-center">
        <div className="text-4xl mb-3">💚</div>
        <h1 className="font-display text-2xl mb-2">{t("updatedTitle")}</h1>
        <p className="text-muted">{t("redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8">
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <p className="text-muted text-sm mt-1">{t("subtitle")}</p>
      </div>

      {error && <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <PasswordInput
          required
          placeholder={t("newPassword")}
          className={inputClass}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordInput
          required
          placeholder={t("repeatPassword")}
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
          {submitting ? t("saving") : t("save")}
        </button>
      </form>
    </div>
  );
}
