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
};

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  /** True for both "admin" and "owner" — owners have all admin capabilities plus ownership transfer. */
  isAdmin: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Session | null) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
