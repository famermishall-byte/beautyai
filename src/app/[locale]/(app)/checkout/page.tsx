"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import { Minus, Plus, Trash2, MessageCircle, Check, CircleCheck, Store, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { unmarkAdded } from "@/lib/session-flags";
import { BannerGate } from "@/components/BannerInterstitial";
import type { Branch } from "@/types";
import { useRouter } from "@/i18n/navigation";

type Step = "branch" | "contact" | "review" | "success";

const STEP_KEYS: Step[] = ["branch", "contact", "review"];

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const price = usePrice();
  const text = useProductText();
  const stepLabels = STEP_KEYS.map((key) => ({ key, label: t(`steps.${key}`) }));
  const { items, hydrated, totalPrice, changeQuantity, removeItem, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<Step>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ orderNumber: string; whatsappUrl: string } | null>(null);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => setBranches(data.branches ?? []));
  }, []);

  useEffect(() => {
    if (hydrated && step !== "success" && items.length === 0) {
      router.replace("/");
    }
  }, [hydrated, step, items.length, router]);

  const selectedBranch = branches.find((b) => b.id === branchId) ?? null;

  async function handleSubmitOrder() {
    if (!selectedBranch) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranch.id,
          customerName,
          customerPhone,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        return;
      }

      // wa.me только ОТКРЫВАЕТ чат с готовым текстом — сам WhatsApp принципиально не даёт
      // отправлять сообщение по ссылке без участия человека (защита от спама), отправить
      // должен сам клиент нажатием «Отправить» внутри WhatsApp. .focus() — лучшее, что можно
      // сделать программно, чтобы обратить на это внимание; предупреждение на экране ниже
      // и кнопка «Открыть WhatsApp снова» — основная подстраховка (жалоба владельца, 24.09:
      // заказ уходил, а продавец в WhatsApp ничего не получал, потому что клиент не нажимал
      // «Отправить», не понимая, что это нужно).
      const waWindow = window.open(data.whatsappUrl, "_blank");
      waWindow?.focus();
      clearCart();
      setSuccessInfo({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
      setStep("success");
    } catch {
      setError(t("somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success" && successInfo) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center animate-rise-in">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-success-soft text-success mb-5">
          <CircleCheck className="size-8" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-3xl mb-3">{t("sentTitle")}</h1>
        <p className="text-muted max-w-md mb-2">
          {t.rich("sentText", { number: successInfo.orderNumber, b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
        </p>
        <p className="text-muted max-w-md mb-6">
          {t("sentHint")}
        </p>

        <Notice tone="warning" className="w-full max-w-md mb-4">
          {t("sentWhatsappWarning")}
        </Notice>

        <div className="w-full max-w-md flex flex-col gap-3">
          <Button variant="whatsapp" size="lg" fullWidth onClick={() => window.open(successInfo.whatsappUrl, "_blank")?.focus()}>
            <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
            {t("reopenWhatsapp")}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => router.push("/")}>
            {t("backToCatalog")}
          </Button>
        </div>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full" aria-busy="true" aria-label={t("loadingCart")}>
        <Skeleton className="h-8 w-1/2 mb-6" />
        <Skeleton className="h-8 w-full mb-8" />
        <Skeleton className="h-24 w-full rounded-card mb-3" />
        <Skeleton className="h-24 w-full rounded-card" />
      </main>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <BannerGate page="checkout" />
      <h1 className="font-display text-3xl mb-5">{t("title")}</h1>

      <ol className="flex items-center gap-2 mb-8">
        {stepLabels.map((s, i) => {
          const isActive = s.key === step;
          const isDone = stepLabels.findIndex((x) => x.key === step) > i;
          return (
            <li key={s.key} className="flex items-center gap-2 min-w-0" aria-current={isActive ? "step" : undefined}>
              <span
                className={[
                  "w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  isActive ? "bg-accent text-on-accent" : isDone ? "bg-accent-soft text-accent-strong" : "bg-state-pressed text-muted",
                ].join(" ")}
              >
                {isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={["text-sm truncate", isActive ? "font-semibold" : "text-muted"].join(" ")}>{s.label}</span>
              {i < stepLabels.length - 1 && <span className="w-4 sm:w-6 h-px bg-border-strong shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {step === "branch" && (
        <div>
          <h2 className="font-display text-xl mb-4">{t("chooseBranch")}</h2>
          {branches.length === 0 ? (
            <EmptyState icon={Store} title={t("noBranches")} />
          ) : (
            <div className="flex flex-col gap-3 mb-6" role="radiogroup" aria-label={t("chooseBranch")}>
              {branches.map((branch) => {
                const selected = branchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBranchId(branch.id)}
                    className={[
                      "text-left rounded-card border p-4 flex items-start gap-3 transition focus-ring",
                      selected ? "border-accent bg-accent-soft shadow-card" : "border-border bg-card hover:border-accent/40",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{branch.name}</div>
                      <div className="text-sm text-muted">{branch.address}</div>
                      <div className="text-xs text-muted mt-1">{branch.hours}</div>
                    </div>
                    <span
                      className={[
                        "w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-colors",
                        selected ? "bg-accent text-on-accent" : "border border-border-strong",
                      ].join(" ")}
                      aria-hidden
                    >
                      {selected && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <Button size="lg" fullWidth onClick={() => setStep("contact")} disabled={!branchId}>
            {t("next")}
          </Button>
        </div>
      )}

      {step === "contact" && (
        <div>
          <h2 className="font-display text-xl mb-4">{t("yourContacts")}</h2>
          <div className="surface-card p-5 flex flex-col gap-4 mb-6">
            <Field id="checkout-name" label={t("namePlaceholder")}>
              <input
                id="checkout-name"
                className="field"
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Field>
            <Field id="checkout-phone" label={t("phonePlaceholder")}>
              <input
                id="checkout-phone"
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep("branch")}>
              <ChevronLeft className="size-4.5" strokeWidth={2} aria-hidden />
              {t("back")}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => setStep("review")}
              disabled={!customerName.trim() || !customerPhone.trim()}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}

      {step === "review" && selectedBranch && (
        <div>
          <h2 className="font-display text-xl mb-4">{t("reviewTitle")}</h2>

          <div className="surface-card p-4 mb-4">
            <div className="text-sm text-muted mb-2">{t("products")}</div>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{text(item.product).name}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 bg-accent-soft rounded-full px-1 py-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.product.id, -1)}
                          aria-label={tCart("decrease", { name: text(item.product).name })}
                          className="w-8 h-8 rounded-full bg-card flex items-center justify-center transition active:scale-90 focus-ring"
                        >
                          <Minus className="size-3" strokeWidth={2.5} aria-hidden />
                        </button>
                        <span className="text-xs font-medium w-5 text-center tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.product.id, 1)}
                          aria-label={tCart("increase", { name: text(item.product).name })}
                          className="w-8 h-8 rounded-full bg-card flex items-center justify-center transition active:scale-90 focus-ring"
                        >
                          <Plus className="size-3" strokeWidth={2.5} aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.product.id);
                          unmarkAdded(item.product.id);
                        }}
                        aria-label={tCart("remove", { name: text(item.product).name })}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:text-error hover:bg-error-soft focus-ring"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.85} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-display tabular-nums shrink-0">
                    {price(item.product.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-display text-lg mt-3 pt-3 border-t border-border">
              <span>{t("total")}</span>
              <span className="tabular-nums">{price(totalPrice)}</span>
            </div>
          </div>

          <div className="surface-card p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="eyebrow">{t("branch")}</div>
              <button onClick={() => setStep("branch")} className="text-sm font-medium text-accent px-2 py-1 -mr-2 rounded-full hover:bg-accent-soft transition focus-ring">
                {t("change")}
              </button>
            </div>
            <div className="font-medium">{selectedBranch.name}</div>
            <div className="text-sm text-muted">{selectedBranch.address}</div>
          </div>

          <div className="surface-card p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <div className="eyebrow">{t("contacts")}</div>
              <button onClick={() => setStep("contact")} className="text-sm font-medium text-accent px-2 py-1 -mr-2 rounded-full hover:bg-accent-soft transition focus-ring">
                {t("change")}
              </button>
            </div>
            <div className="font-medium">{customerName}</div>
            <div className="text-sm text-muted">{customerPhone}</div>
          </div>

          {error && (
            <Notice tone="error" className="mb-4">
              {error}
            </Notice>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep("contact")}>
              <ChevronLeft className="size-4.5" strokeWidth={2} aria-hidden />
              {t("back")}
            </Button>
            <Button variant="whatsapp" size="lg" className="flex-1" onClick={handleSubmitOrder} loading={submitting}>
              {!submitting && <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />}
              {submitting ? t("sending") : t("sendWhatsApp")}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
