"use client";

import { useRef, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import type { ConsultantResponse } from "@/types";

const SCENARIOS = [
  { emoji: "💄", label: "Собрать косметичку", query: "Собери мне косметичку для повседневного макияжа" },
  { emoji: "🧴", label: "Подобрать уход", query: "Подбери уход для лица" },
  { emoji: "🎁", label: "Выбрать подарок", query: "Мне нужен подарок на день рождения" },
  { emoji: "💰", label: "Найти до бюджета", query: "Что можно найти до 1000 сом" },
  { emoji: "🔎", label: "Найти товар", query: "" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultantResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(message: string) {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data: ConsultantResponse = await res.json();
      if (!res.ok) {
        setResult({ found: false, message: data.error ?? "Не удалось получить рекомендации.", products: [] });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ found: false, message: "Что-то пошло не так. Попробуйте ещё раз.", products: [] });
    } finally {
      setLoading(false);
    }
  }

  function handleScenario(scenarioQuery: string) {
    if (scenarioQuery) {
      setQuery(scenarioQuery);
      ask(scenarioQuery);
    } else {
      // "Найти товар" — просто ставим фокус в поле поиска, чтобы человек ввёл свой запрос
      inputRef.current?.focus();
    }
  }

  const canSubmit = query.trim().length > 0 && !loading;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-4">
            Что вы ищете?
          </h1>
          <p className="text-muted mb-8">
            Опишите своими словами — подберём то, что реально есть в наличии
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(query);
            }}
            className="flex gap-2 mb-6"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: уход для сухой кожи до 2000 сом"
              className="flex-1 rounded-full border border-black/10 bg-card px-5 py-3 outline-none transition focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-foreground text-background px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Найти
            </button>
          </form>

          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleScenario(s.query)}
                className="rounded-full bg-accent-soft text-accent px-4 py-2 text-sm font-medium transition hover:bg-accent hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-muted animate-pulse">Подбираем варианты…</div>}

        {result && !loading && (
          <div className="w-full max-w-5xl">
            <p className="text-center text-lg mb-8 font-display">{result.message}</p>
            {result.products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

      <CartDrawer />
    </main>
  );
}
