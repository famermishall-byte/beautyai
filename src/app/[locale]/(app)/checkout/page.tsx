"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import type { Branch } from "@/types";
import { useRouter } from "@/i18n/navigation";

type Step = "branch" | "contact" | "review" | "success";

const STEP_KEYS: Step[] = ["branch", "contact", "review"];

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const price = usePrice();
  const text = useProductText();
  const stepLabels = STEP_KEYS.map((key) => ({ key, label: t(`steps.${key}`) }));
  const { items, hydrated, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<Step>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ orderNumber: string } | null>(null);

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

      window.open(data.whatsappUrl, "_blank");
      clearCart();
      setSuccessInfo({ orderNumber: data.orderNumber });
      setStep("success");
    } catch {
      setError(t("somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-black/10 bg-card px-4 py-3 outline-none transition focus:ring-2 focus:ring-accent";

  if (step === "success" && successInfo) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="text-5xl mb-4">💚</div>
        <h1 className="font-display text-3xl mb-3">{t("sentTitle")}</h1>
        <p className="text-muted max-w-md mb-2">
          {t.rich("sentText", { number: successInfo.orderNumber, b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
        </p>
        <p className="text-muted max-w-md mb-8">
          {t("sentHint")}
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {t("backToCatalog")}
        </button>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="text-muted animate-pulse">{t("loadingCart")}</p>
      </main>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-6">{t("title")}</h1>

      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((s, i) => {
          const isActive = s.key === step;
          const isDone = stepLabels.findIndex((x) => x.key === step) > i;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                  isActive ? "bg-accent text-white" : isDone ? "bg-accent-soft text-accent" : "bg-black/5 text-muted",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <span className={isActive ? "text-sm font-medium" : "text-sm text-muted"}>{s.label}</span>
              {i < stepLabels.length - 1 && <span className="w-6 h-px bg-black/10 mx-1" />}
            </div>
          );
        })}
      </div>

      {step === "branch" && (
        <div>
          <h2 className="font-medium mb-4">{t("chooseBranch")}</h2>
          {branches.length === 0 ? (
            <p className="text-muted text-sm">{t("noBranches")}</p>
          ) : (
            <div className="flex flex-col gap-3 mb-6">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => setBranchId(branch.id)}
                  className={[
                    "text-left rounded-xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    branchId === branch.id ? "border-accent bg-accent-soft" : "border-black/10 bg-card hover:border-accent/50",
                  ].join(" ")}
                >
                  <div className="font-medium">{branch.name}</div>
                  <div className="text-sm text-muted">{branch.address}</div>
                  <div className="text-xs text-muted mt-1">{branch.hours}</div>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setStep("contact")}
            disabled={!branchId}
            className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("next")}
          </button>
        </div>
      )}

      {step === "contact" && (
        <div>
          <h2 className="font-medium mb-4">{t("yourContacts")}</h2>
          <div className="flex flex-col gap-3 mb-6">
            <input
              className={inputClass}
              placeholder={t("namePlaceholder")}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder={t("phonePlaceholder")}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("branch")}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("back")}
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!customerName.trim() || !customerPhone.trim()}
              className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}

      {step === "review" && selectedBranch && (
        <div>
          <h2 className="font-medium mb-4">{t("reviewTitle")}</h2>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-4">
            <div className="text-sm text-muted mb-2">{t("products")}</div>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>
                    {text(item.product).name} × {item.quantity}
                  </span>
                  <span>{price(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-display text-lg mt-3 pt-3 border-t border-black/10">
              <span>{t("total")}</span>
              <span>{price(totalPrice)}</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-muted">{t("branch")}</div>
              <button onClick={() => setStep("branch")} className="text-xs text-accent underline">
                {t("change")}
              </button>
            </div>
            <div className="font-medium">{selectedBranch.name}</div>
            <div className="text-sm text-muted">{selectedBranch.address}</div>
          </div>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-muted">{t("contacts")}</div>
              <button onClick={() => setStep("contact")} className="text-xs text-accent underline">
                {t("change")}
              </button>
            </div>
            <div className="font-medium">{customerName}</div>
            <div className="text-sm text-muted">{customerPhone}</div>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setStep("contact")}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("back")}
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="rounded-full bg-[#25D366] text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {submitting ? t("sending") : t("sendWhatsApp")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
