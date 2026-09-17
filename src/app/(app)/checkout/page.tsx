"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import type { Branch } from "@/types";

type Step = "branch" | "contact" | "review" | "success";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "branch", label: "Филиал" },
  { key: "contact", label: "Контакты" },
  { key: "review", label: "Подтверждение" },
];

export default function CheckoutPage() {
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
        setError(data.error ?? "Не удалось оформить заказ.");
        return;
      }

      window.open(data.whatsappUrl, "_blank");
      clearCart();
      setSuccessInfo({ orderNumber: data.orderNumber });
      setStep("success");
    } catch {
      setError("Что-то пошло не так. Попробуйте ещё раз.");
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
        <h1 className="font-display text-3xl mb-3">Заказ отправлен</h1>
        <p className="text-muted max-w-md mb-2">
          Мы передали ваш заказ <span className="font-medium text-foreground">#{successInfo.orderNumber}</span> в выбранный магазин.
        </p>
        <p className="text-muted max-w-md mb-8">
          Продавец свяжется с вами для подтверждения заказа и оформления доставки.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Вернуться в каталог
        </button>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="text-muted animate-pulse">Загружаем корзину…</p>
      </main>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-6">Оформление заказа</h1>

      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((s, i) => {
          const isActive = s.key === step;
          const isDone = STEP_LABELS.findIndex((x) => x.key === step) > i;
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
              {i < STEP_LABELS.length - 1 && <span className="w-6 h-px bg-black/10 mx-1" />}
            </div>
          );
        })}
      </div>

      {step === "branch" && (
        <div>
          <h2 className="font-medium mb-4">Выберите удобный филиал</h2>
          {branches.length === 0 ? (
            <p className="text-muted text-sm">Филиалы ещё не настроены магазином.</p>
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
            Далее
          </button>
        </div>
      )}

      {step === "contact" && (
        <div>
          <h2 className="font-medium mb-4">Ваши контакты</h2>
          <div className="flex flex-col gap-3 mb-6">
            <input
              className={inputClass}
              placeholder="Ваше имя"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Номер телефона"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("branch")}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Назад
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!customerName.trim() || !customerPhone.trim()}
              className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {step === "review" && selectedBranch && (
        <div>
          <h2 className="font-medium mb-4">Проверьте заказ</h2>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-4">
            <div className="text-sm text-muted mb-2">Товары</div>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>{(item.product.price * item.quantity).toLocaleString("ru-RU")} сом</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-display text-lg mt-3 pt-3 border-t border-black/10">
              <span>Итого</span>
              <span>{totalPrice.toLocaleString("ru-RU")} сом</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-muted">Филиал</div>
              <button onClick={() => setStep("branch")} className="text-xs text-accent underline">
                Изменить
              </button>
            </div>
            <div className="font-medium">{selectedBranch.name}</div>
            <div className="text-sm text-muted">{selectedBranch.address}</div>
          </div>

          <div className="bg-card rounded-xl border border-black/5 p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-muted">Контакты</div>
              <button onClick={() => setStep("contact")} className="text-xs text-accent underline">
                Изменить
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
              Назад
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="rounded-full bg-[#25D366] text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {submitting ? "Отправляем…" : "Отправить заказ в WhatsApp"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
