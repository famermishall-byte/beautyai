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
  birthDate: string | null;
  gender: string | null;
  hairType: string | null;
  hairConcerns: string[];
  avatarUrl: string | null;
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

    // Fetching the session on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
