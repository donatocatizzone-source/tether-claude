import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { appUrl } from "@/lib/env";

// Port of OLD/src/contexts/AuthContext.tsx (see CLAUDE.md > Ground truth).
// Real Supabase Auth did not exist in this rebuild before now — every
// screen was reachable with no login. Auth calls will fail with a network
// error until .env.local has a real Supabase project (see lib/supabase.ts).
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // appUrl(), not window.location.origin: production is served from
        // /tether-claude/, so an origin-rooted confirmation link 404s.
        emailRedirectTo: appUrl(),
        data: { full_name: fullName },
      },
    });

    // Whether a confirmation email was sent depends on a project setting the
    // client can't read. Supabase tells us implicitly: with confirmation on,
    // no session comes back. Reporting that lets the UI stop guessing — it
    // used to always say "check your email", even when it had just signed the
    // user straight in.
    return {
      error: error as Error | null,
      needsConfirmation: !error && !data.session,
    };
  }

  async function resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: appUrl() },
    });
    return { error: error as Error | null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
}
