"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session-context";
import { Link, useRouter } from "@/i18n/navigation";

import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
// Errors raised by the transfer_store_ownership SQL function; shown from messages: adminSettings.transferErrors.<code>
const TRANSFER_ERROR_CODES = ["not_owner", "target_not_registered", "cannot_transfer_to_self", "not_authenticated"];

export default function AdminSettingsPage() {
  const t = useTranslations("adminSettings");
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
        setEmailError(t("emailFailed", { message: error.message }));
        return;
      }
      setEmailNotice(
        t("emailSent", { email: newEmail.trim() })
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
      setPasswordError(t("passwordShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    setPasswordSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(t("passwordFailed", { message: error.message }));
        return;
      }
      setPasswordNotice(t("passwordUpdated"));
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
        t("transferConfirm", { store: session?.storeName ?? "", email: transferEmail.trim() })
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
        setTransferError(TRANSFER_ERROR_CODES.includes(error.message) ? t(`transferErrors.${error.message}`) : t("transferFailed", { message: error.message }));
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
    "w-full rounded-control border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <Link href="/admin" className="text-sm text-accent underline mb-4 inline-block">
        ← {t("backToPanel")}
      </Link>
      <h1 className="font-display text-3xl leading-tight">{t("title")}</h1>
      <p className="text-muted text-sm mt-1.5 mb-6">
        {t.rich("signedInAs", {
          email: session?.email ?? "",
          role: isOwner ? t("roleOwner") : session?.role === "branch_manager" ? t("roleBranchManager") : t("roleAdmin"),
          store: session?.storeName ?? "",
          b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
        })}
      </p>

      <button
        onClick={() => signOut()}
        className={buttonClasses({ variant: "ghost", size: "sm", className: "mb-6" })}
      >
        {t("signOut")}
      </button>

      <div className="surface-card p-6 mb-6">
        <h2 className="font-medium mb-3">Email</h2>
        {emailNotice && (
          <Notice tone="accent" className="mb-3">{emailNotice}</Notice>
        )}
        {emailError && (
          <Notice tone="error" className="mb-3">{emailError}</Notice>
        )}
        <form onSubmit={handleChangeEmail} className="flex gap-2">
          <input
            type="email"
            placeholder={t("newEmail")}
            className={inputClass}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={emailSubmitting || !newEmail.trim()}
            className={buttonClasses({ size: "sm", className: "shrink-0" })}
          >
            {emailSubmitting ? t("sending") : t("changeEmail")}
          </button>
        </form>
      </div>

      <div className="surface-card p-6 mb-6">
        <h2 className="font-medium mb-3">{t("password")}</h2>
        {passwordNotice && (
          <Notice tone="accent" className="mb-3">{passwordNotice}</Notice>
        )}
        {passwordError && (
          <Notice tone="error" className="mb-3">{passwordError}</Notice>
        )}
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder={t("newPassword")}
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("repeatPassword")}
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={passwordSubmitting || !newPassword}
            className={buttonClasses({ size: "sm", className: "self-start" })}
          >
            {passwordSubmitting ? t("saving") : t("changePassword")}
          </button>
        </form>
      </div>

      {isOwner && (
        <div className="surface-card p-6">
          <h2 className="font-medium mb-1">{t("transferTitle")}</h2>
          <p className="text-sm text-muted mb-4">
            {t("transferHint")}
          </p>
          {transferError && (
            <Notice tone="error" className="mb-3">{transferError}</Notice>
          )}
          <form onSubmit={handleTransferOwnership} className="flex gap-2">
            <input
              type="email"
              placeholder={t("newOwnerEmail")}
              className={inputClass}
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={transferSubmitting || !transferEmail.trim()}
              className={buttonClasses({ variant: "danger", size: "sm", className: "shrink-0" })}
            >
              {transferSubmitting ? t("transferring") : t("transfer")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
