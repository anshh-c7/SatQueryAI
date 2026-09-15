"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  authMessage: string | null;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    let mounted = true;
    const validateSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await client.auth.signOut({ scope: "local" });
        if (mounted) {
          setSession(null);
          setAuthMessage(profileError
            ? "We could not verify your account. Please try again."
            : "This account is no longer registered. Please create a new account.");
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setSession(nextSession);
        setAuthMessage(null);
        setLoading(false);
      }
    };

    void client.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        await client.auth.signOut({ scope: "local" });
        if (mounted) {
          setSession(null);
          setAuthMessage("Your session expired. Please sign in again.");
          setLoading(false);
        }
        return;
      }
      await validateSession(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      setTimeout(() => void validateSession(nextSession), 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const deleteAccount = async () => {
    if (!supabase) return { error: new Error("Supabase is not configured") };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return { error: sessionError ?? new Error("Your session has expired. Please sign in again.") };
    }

    const response = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    if (!response.ok) {
      let detail = "Account deletion failed.";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // Keep the stable fallback when the route returns a non-JSON error.
      }
      return { error: new Error(detail) };
    }

    await supabase.auth.signOut();
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        configured: Boolean(supabase),
        authMessage,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
