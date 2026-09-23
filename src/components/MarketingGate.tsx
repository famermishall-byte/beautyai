"use client";

import { useEffect, useState } from "react";
import { BannerInterstitial } from "./BannerInterstitial";
import { PromotionInterstitial } from "./PromotionInterstitial";
import { wasAdShown, markAdShown, wasPromoAdShown, markPromoAdShown } from "@/lib/session-flags";
import type { Banner, Product } from "@/types";

type MarketingPage = "home" | "catalog";

/**
 * Показывает баннер и акцию как ДВА отдельных всплывающих окна одно за другим (не одновременно
 * поверх друг друга, иначе они наложились бы) — сначала баннер (если есть и ещё не показан в
 * этом посещении), потом акция (если есть и ещё не показана). Каждое — не чаще раза за посещение
 * на страницу, см. session-flags.ts. По просьбе владельца (24.09): акции всплывают отдельно от
 * баннеров, на главной и в каталоге (на /checkout остался только баннер — BannerGate).
 */
export function MarketingGate({ page }: { page: MarketingPage }) {
  const [step, setStep] = useState<"banner" | "promotion" | "done">("banner");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [promotion, setPromotion] = useState<Product | null>(null);

  useEffect(() => {
    if (step !== "banner") return;
    // sessionStorage недоступен при рендере/SSR — читаем только здесь, в эффекте (тот же приём,
    // что и во всём остальном коде пометок "на посещение", см. session-flags.ts); setState
    // отложен микрозадачей, чтобы не вызывать его синхронно прямо в теле эффекта.
    if (wasAdShown(page)) {
      Promise.resolve().then(() => setStep("promotion"));
      return;
    }
    let cancelled = false;
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: Banner[] }) => {
        if (cancelled) return;
        const top = (data.banners ?? [])[0];
        // Баннера сейчас нет — не помечаем показанным (см. markAdShown ниже): вдруг появится
        // позже в этом же посещении, тогда следующий вход на страницу его ещё застанет.
        if (!top) {
          setStep("promotion");
          return;
        }
        Promise.resolve().then(() => {
          markAdShown(page);
          setBanner(top);
        });
      })
      .catch(() => {
        if (!cancelled) setStep("promotion");
      });
    return () => {
      cancelled = true;
    };
  }, [page, step]);

  useEffect(() => {
    if (step !== "promotion") return;
    if (wasPromoAdShown(page)) {
      Promise.resolve().then(() => setStep("done"));
      return;
    }
    let cancelled = false;
    fetch("/api/promotions")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        if (cancelled) return;
        const top = (data.products ?? [])[0];
        if (!top) {
          setStep("done");
          return;
        }
        Promise.resolve().then(() => {
          markPromoAdShown(page);
          setPromotion(top);
          setStep("done");
        });
      })
      .catch(() => {
        if (!cancelled) setStep("done");
      });
    return () => {
      cancelled = true;
    };
  }, [page, step]);

  if (banner) {
    return (
      <BannerInterstitial
        banner={banner}
        onClose={() => {
          setBanner(null);
          setStep("promotion");
        }}
      />
    );
  }
  if (promotion) {
    return <PromotionInterstitial product={promotion} onClose={() => setPromotion(null)} />;
  }
  return null;
}
