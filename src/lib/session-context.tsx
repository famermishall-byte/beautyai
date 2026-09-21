"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type Session = {
  email: string | null;
  role: string;
  storeId: string;
  branchId?: string | null;
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
  /** Working in the admin area right now (a staff member on /admin/*). In the storefront the same person is a customer. */
  isAdmin: boolean;
  /** Has an owner / admin / branch-manager role — may switch between the admin area and the storefront. */
  isManager: boolean;
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
  const pathname = usePathname();
  const isManager = session?.role === "admin" || session?.role === "owner" || session?.role === "branch_manager";

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
        isAdmin: isManager && pathname.startsWith("/admin"),
        isManager,
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
