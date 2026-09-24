"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleCheck, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
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
    "field";

  if (!ready) {
    return (
      <div className="bg-card rounded-sheet shadow-float border border-border p-6 sm:p-8 text-center">
        <p className="text-muted inline-flex items-center gap-2" role="status">
          <Loader2 className="size-4 animate-spin text-accent" strokeWidth={2.25} aria-hidden />
          {t("checking")}
        </p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="bg-card rounded-sheet shadow-float border border-border p-6 sm:p-8 text-center">
        <span className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-error-soft text-error">
          <LinkIcon className="size-7" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-2xl mb-3">{t("invalidTitle")}</h1>
        <p className="text-muted mb-6">
          {t("invalidText")}
        </p>
        <Link
          href="/login"
          className={buttonClasses({ size: "lg" })}
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-card rounded-sheet shadow-float border border-border p-6 sm:p-8 text-center">
        <span className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-success-soft text-success">
          <CircleCheck className="size-8" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-2xl mb-2">{t("updatedTitle")}</h1>
        <p className="text-muted">{t("redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-sheet shadow-float border border-border p-6 sm:p-8">
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <p className="text-muted text-sm mt-1">{t("subtitle")}</p>
      </div>

      {error && <Notice tone="error" className="mb-4">{error}</Notice>}

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
        <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
            {submitting ? t("saving") : t("save")}
          </Button>
      </form>
    </div>
  );
}
