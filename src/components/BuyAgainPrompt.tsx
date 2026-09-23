"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session-context";
import { usePurchaseHistory } from "@/lib/purchase-history-context";
import { wasHomePromptShown, markHomePromptShown } from "@/lib/session-flags";
import { BuyAgainModal } from "@/components/BuyAgainModal";

/** На главной, не чаще раза за посещение: предлагает один из товаров, купленных 2+ раза. */
export function BuyAgainPrompt() {
  const { session, isAdmin } = useSession();
  const { loading, repeatProductIds } = usePurchaseHistory();
  const [productId, setProductId] = useState<string | null>(null);

  // sessionStorage недоступен при рендере/SSR — решаем после монтирования
  // (отложено через микрозадачу — тот же приём, что в NavHeader.tsx).
  useEffect(() => {
    Promise.resolve().then(() => {
      if (!session || isAdmin || loading || wasHomePromptShown() || repeatProductIds.length === 0) return;
      markHomePromptShown();
      setProductId(repeatProductIds[Math.floor(Math.random() * repeatProductIds.length)]);
    });
  }, [session, isAdmin, loading, repeatProductIds]);

  if (!productId) return null;
  return <BuyAgainModal productId={productId} onClose={() => setProductId(null)} />;
}
