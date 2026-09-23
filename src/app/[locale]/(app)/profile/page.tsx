"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Heart,
  MapPin,
  Store,
  MessageCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  KeyRound,
  Pencil,
  Sparkles,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { useSession } from "@/lib/session-context";
import { getStoredCity } from "@/lib/city";
import type { SkinType, SkinConcern } from "@/lib/skincare";
import type { HairType, HairConcern } from "@/lib/haircare";
import { buildCareKit } from "@/lib/kit";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { QuestionnaireSummary } from "@/components/profile/QuestionnaireSummary";
import { QuestionnaireForm } from "@/components/profile/QuestionnaireForm";
import { CareKitView } from "@/components/profile/CareKitView";
import { NotificationGeoSettings } from "@/components/profile/NotificationGeoSettings";
import type { Product } from "@/types";
import { Link } from "@/i18n/navigation";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tKit = useTranslations("kit");
  const tSkin = useTranslations("skin");
  const tHair = useTranslations("hair");
  const { session, loading, isManager, signOut, refresh } = useSession();

  const [city, setCity] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const kitRef = useRef<HTMLDivElement>(null);

  const [showAccount, setShowAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const skinType = (session?.skinType as SkinType | null) ?? null;
  const skinConcerns = useMemo(() => (session?.skinConcerns as SkinConcern[]) ?? [], [session?.skinConcerns]);
  const hairType = (session?.hairType as HairType | null) ?? null;
  const hairConcerns = useMemo(() => (session?.hairConcerns as HairConcern[]) ?? [], [session?.hairConcerns]);
  const hasAnswers = !!skinType || !!hairType || skinConcerns.length > 0 || hairConcerns.length > 0;
  const isEditing = editing ?? !hasAnswers;

  useEffect(() => {
    // Read after mount (SSR has no localStorage) — see the same rationale in page.tsx (home).
    Promise.resolve().then(() => setCity(getStoredCity()));
  }, []);

  useEffect(() => {
    if (!hasAnswers || products !== null) return;
    // Fetching data when the questionnaire has answers — see the same pattern in BranchManager.tsx.
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, [hasAnswers, products]);

  useEffect(() => {
    if (savedTick > 0) kitRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [savedTick]);

  const kit = useMemo(
    () => (products ? buildCareKit(products, skinType, skinConcerns, hairType, hairConcerns, { kit: tKit, skin: tSkin, hair: tHair }) : null),
    [products, skinType, skinConcerns, hairType, hairConcerns, tKit, tSkin, tHair]
  );

  async function handleQuestionnaireSaved() {
    await refresh();
    setEditing(false);
    setSavedTick((n) => n + 1);
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

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? t("deleteFailed"));
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

  if (loading || !session) {
    return (
      <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </main>
    );
  }

  const inputClass =
    "w-full rounded-[var(--radius-control)] border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent";
  const cardClass = "bg-card rounded-[var(--radius-card)] border border-border p-5 mb-4 shadow-[var(--shadow-card)]";
  const initial = (session.displayName ?? session.email ?? "").trim().charAt(0).toUpperCase();

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <h1 className="font-title text-3xl leading-tight mb-6 text-center">{t("title")}</h1>

      <div className={`${cardClass} flex flex-col items-center pt-6`}>
        <AvatarUploader avatarUrl={session.avatarUrl} initial={initial} onChanged={refresh} />
        <div className="text-center mt-4">
          <div className="font-display text-xl leading-tight">{session.displayName ?? t("welcome")}</div>
          <div className="text-sm text-muted mt-0.5">{session.email}</div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">{t("myQuestionnaire")}</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm text-accent font-medium hover:underline"
            >
              <Pencil className="size-3.5" strokeWidth={2} aria-hidden />
              {t("edit")}
            </button>
          )}
        </div>

        {isEditing ? (
          <>
            {!hasAnswers && (
              <p className="text-sm text-muted mb-5 leading-relaxed">
                {t("questionnaireIntro")}
              </p>
            )}
            <QuestionnaireForm
              session={session}
              onSaved={handleQuestionnaireSaved}
              onCancel={hasAnswers ? () => setEditing(false) : undefined}
            />
          </>
        ) : (
          <QuestionnaireSummary
            birthDate={session.birthDate}
            gender={session.gender}
            skinType={skinType}
            skinConcerns={skinConcerns}
            hairType={hairType}
            hairConcerns={hairConcerns}
          />
        )}
      </div>

      {hasAnswers && !isEditing && (
        <div ref={kitRef} className="mb-6 scroll-mt-20 animate-rise-in">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="size-4 text-accent" strokeWidth={2} aria-hidden />
            <h2 className="font-display text-xl">{t("yourKit")}</h2>
          </div>
          {kit ? <CareKitView kit={kit} /> : <Skeleton className="h-64 rounded-[var(--radius-card)]" />}
        </div>
      )}

      <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] overflow-hidden mb-4">
        <MenuRow href="/city" icon={MapPin} label={t("menu.city")} hint={city ?? t("menu.cityNotChosen")} />
        <MenuRow href="/branches" icon={Store} label={t("menu.stores")} hint={t("menu.storesHint")} />
        <MenuRow href="/mybag" icon={Heart} label={t("menu.myBag")} hint={t("menu.myBagHint")} />
        <MenuRow href="/orders" icon={ShoppingBag} label={t("menu.orders")} hint={t("menu.ordersHint")} />
        <MenuRow href="/feedback" icon={MessageCircle} label={t("menu.feedback")} last={!isManager} />
        {isManager && (
          <>
            <MenuRow href="/admin" icon={LayoutDashboard} label={t("menu.adminPanel")} />
            <MenuRow href="/admin/settings" icon={Settings} label={t("menu.storeSettings")} last />
          </>
        )}
      </div>

      <NotificationGeoSettings />

      <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAccount((v) => !v)}
          aria-expanded={showAccount}
          className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition hover:bg-black/[0.02]"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent shrink-0">
            <KeyRound className="size-4.5" strokeWidth={1.85} aria-hidden />
          </span>
          <span className="flex-1 text-sm font-medium">{t("emailAndPassword")}</span>
          <ChevronDown className={["size-4 text-muted transition-transform", showAccount ? "rotate-180" : ""].join(" ")} strokeWidth={2} aria-hidden />
        </button>

        {showAccount && (
          <div className="px-5 pb-5 pt-1 flex flex-col gap-6 border-t border-border">
            <form onSubmit={handleChangeEmail} className="flex flex-col gap-3 pt-4">
              <h3 className="text-sm font-medium">Email</h3>
              {emailNotice && (
                <p className="text-sm bg-accent-soft text-accent-strong rounded-[var(--radius-control)] px-4 py-3">{emailNotice}</p>
              )}
              {emailError && (
                <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{emailError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t("newEmail")}
                  className={inputClass}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={emailSubmitting || !newEmail.trim()} className="shrink-0">
                  {emailSubmitting ? t("sending") : t("change")}
                </Button>
              </div>
            </form>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">{t("password")}</h3>
              {passwordNotice && (
                <p className="text-sm bg-accent-soft text-accent-strong rounded-[var(--radius-control)] px-4 py-3">{passwordNotice}</p>
              )}
              {passwordError && (
                <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3">{passwordError}</p>
              )}
              <PasswordInput
                placeholder={t("newPassword")}
                className={inputClass}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <PasswordInput
                placeholder={t("repeatPassword")}
                className={inputClass}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              <Button type="submit" size="sm" disabled={passwordSubmitting || !newPassword} className="self-start">
                {passwordSubmitting ? t("saving") : t("savePassword")}
              </Button>
            </form>
          </div>
        )}
      </div>

      <Button variant="ghost" size="lg" fullWidth onClick={() => signOut()}>
        <LogOut className="size-4.5" strokeWidth={1.85} aria-hidden />
        {t("signOut")}
      </Button>

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full text-center text-xs text-muted underline mt-6 transition hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        {t("deleteAccount")}
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm bg-background rounded-[var(--radius-card)] shadow-xl p-6 animate-rise-in">
            <h2 className="font-display text-xl mb-3">{t("deleteTitle")}</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              {t("deleteWarning")}
            </p>
            {deleteError && <p className="text-sm text-error mb-4">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                {t("cancel")}
              </Button>
              <Button variant="danger" className="flex-1" disabled={deleting} onClick={handleDeleteAccount}>
                {deleting ? t("deleting") : t("delete")}
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
  hint,
  last = false,
}: {
  href: string;
  icon: typeof ShoppingBag;
  label: string;
  hint?: string;
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
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted truncate">{hint}</span>}
      </span>
      <ChevronRight className="size-4 text-muted shrink-0" strokeWidth={2} aria-hidden />
    </Link>
  );
}
