"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type Session = {
  email: string | null;
  role: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  displayName: string | null;
  skinType: string | null;
  skinConcerns: string[];
};

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  /** True for both "admin" and "owner" — owners have all admin capabilities plus ownership transfer. */
  isAdmin: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch the session after something like the skin profile changes server-side. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function loadSession() {
    try {
      const res = await fetch("/api/me");
      setSession(res.ok ? await res.json() : null);
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    loadSession().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    await loadSession();
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    // Cart/orders are stored in localStorage, not scoped to an account — clear
    // them on sign-out so the next person on this device/browser doesn't see
    // items left behind by whoever was logged in before.
    try {
      localStorage.removeItem("beautyai-cart");
    } catch {
      // недоступно — не критично
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        isAdmin: session?.role === "admin" || session?.role === "owner",
        isOwner: session?.role === "owner",
        signOut,
        refresh,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession должен использоваться внутри SessionProvider");
  return ctx;
}
