"use client";

import { Suspense, type ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { CartProvider } from "@/lib/cart-context";
import { MyBagProvider } from "@/lib/mybag-context";
import { PurchaseHistoryProvider } from "@/lib/purchase-history-context";
import { AppSplashGate } from "@/components/AppSplashGate";
import { AccessDeniedBanner } from "@/components/AccessDeniedBanner";
import { NavHeader } from "@/components/NavHeader";
import { BottomNav } from "@/components/BottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { FirstRunFlow } from "@/components/FirstRunFlow";
import { PushSync } from "@/components/PushSync";
import { FeedbackProvider } from "@/components/ui/Feedback";

export function AppProviders({
  children,
  splashAlreadyShown,
}: {
  children: ReactNode;
  splashAlreadyShown: boolean;
}) {
  return (
    <SessionProvider>
      <FeedbackProvider>
      <CartProvider>
        <MyBagProvider>
          <PurchaseHistoryProvider>
            <AppSplashGate initialAlreadyShown={splashAlreadyShown}>
              <Suspense fallback={null}>
                <AccessDeniedBanner />
              </Suspense>
              <NavHeader />
              {/* overflow-x-clip здесь, а не на html/body: на корне страницы он ломает прикреплённые к низу элементы на iPhone */}
              <div className="pb-20 overflow-x-clip">{children}</div>
              <CartDrawer />
              <BottomNav />
              <FirstRunFlow />
              <PushSync />
            </AppSplashGate>
          </PurchaseHistoryProvider>
        </MyBagProvider>
      </CartProvider>
      </FeedbackProvider>
    </SessionProvider>
  );
}
