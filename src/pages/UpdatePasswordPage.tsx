import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Reached from a password-recovery email at /auth/update-password.
//
// Routed OUTSIDE AuthRoute deliberately. Supabase turns the recovery token in
// the URL fragment into a real session, so the user IS signed in by the time
// this renders — and AuthRoute redirects anyone signed in to /consumer. Put
// this behind it and the recovery link bounces the user away before they can
// type a new password. That is the whole trap in this flow.
export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  // The recovery session arrives asynchronously as supabase-js parses the URL
  // fragment, so we can't just read getSession() on first paint.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });

    // If no session has materialised shortly after load, the link is stale.
    const timer = setTimeout(() => {
      if (!cancelled) setReady((r) => (r === null ? false : r));
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Those passwords don't match");
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate("/consumer");
  }

  if (ready === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ready === false) {
    return (
      <PageContainer className="flex min-h-screen flex-col items-center justify-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">This reset link isn't active</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Reset links expire and can only be used once. Request a new one from the sign-in page.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => navigate("/auth")}>
          Back to sign in
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-foreground">
            <KeyRound size={19} className="text-background" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Choose a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">You'll be signed in once it's saved.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Check size={15} className="mr-2" />}
            {saving ? "Saving…" : "Update password"}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
