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

export function AppProviders({
  children,
  splashAlreadyShown,
}: {
  children: ReactNode;
  splashAlreadyShown: boolean;
}) {
  return (
    <SessionProvider>
      <CartProvider>
        <MyBagProvider>
          <PurchaseHistoryProvider>
            <AppSplashGate initialAlreadyShown={splashAlreadyShown}>
              <Suspense fallback={null}>
                <AccessDeniedBanner />
              </Suspense>
              <NavHeader />
              <div className="pb-20">{children}</div>
              <CartDrawer />
              <BottomNav />
              <FirstRunFlow />
            </AppSplashGate>
          </PurchaseHistoryProvider>
        </MyBagProvider>
      </CartProvider>
    </SessionProvider>
  );
}
