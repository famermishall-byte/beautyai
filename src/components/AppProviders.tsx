"use client";

import { Suspense, type ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { CartProvider } from "@/lib/cart-context";
import { AppSplashGate } from "@/components/AppSplashGate";
import { AccessDeniedBanner } from "@/components/AccessDeniedBanner";
import { NavHeader } from "@/components/NavHeader";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <AppSplashGate>
          <Suspense fallback={null}>
            <AccessDeniedBanner />
          </Suspense>
          <NavHeader />
          {children}
        </AppSplashGate>
      </CartProvider>
    </SessionProvider>
  );
}
