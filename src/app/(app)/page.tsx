"use client";

import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { skinTypeLabel } from "@/lib/skincare";

const CARDS = [
  {
    href: "/routine",
    emoji: "🧴",
    title: "Мой уход",
    text: "Порядок утром и вечером",
  },
  {
    href: "/catalog?tab=search",
    emoji: "🔎",
    title: "Найти товар",
    text: "По названию или бренду",
  },
  {
    href: "/catalog?tab=budget",
    emoji: "💰",
    title: "По бюджету",
    text: "Товары в вашей цене",
  },
  {
    href: "/mybag",
    emoji: "❤️",
    title: "Моя косметичка",
    text: "Сохранённые товары",
  },
];

export default function Home() {
  const { session } = useSession();
  const skinLabel = skinTypeLabel(session?.skinType ?? null);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">{session?.storeName || "ОПТОВЫЕ ЦЕНЫ 01"}</h1>
        <p className="text-muted mt-2">Красота начинается с правильного ухода</p>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted mb-1">Моя кожа</div>
          <div className="font-display text-xl">
            {skinLabel ?? "Расскажите нам о своей коже"}
          </div>
        </div>
        <Link
          href="/skin-profile"
          className="shrink-0 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Настроить
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-2 transition hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="text-3xl">{card.emoji}</span>
            <span className="font-display text-lg leading-snug">{card.title}</span>
            <span className="text-sm text-muted">{card.text}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
