import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Port of OLD/src/pages/AuthPage.tsx (see CLAUDE.md > Ground truth). Real
// Supabase Auth did not exist in this rebuild before now. Sign-in/sign-up
// will fail with a network error until .env.local has a real Supabase
// project (see src/lib/supabase.ts).
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const redirectPath = searchParams.get("redirect");
  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; orgName: string } | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // If an invite token is present, look it up to pre-fill the email.
  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      const { data } = await supabase
        .from("org_invitations")
        .select("email, organization_id")
        .eq("token", inviteToken)
        .eq("status", "pending")
        .single();
      if (data) {
        setEmail(data.email);
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", data.organization_id)
          .single();
        setInviteInfo({ email: data.email, orgName: org?.name || "your team" });
      }
    })();
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate(redirectPath || "/consumer");
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-foreground">
            <Shield size={26} className="text-background" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Tether</h1>
          <p className="text-sm text-muted-foreground">
            {inviteInfo ? `You've been invited to join ${inviteInfo.orgName}` : "Your personal safety companion"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required={!isLogin}
                className="h-12 rounded-lg border-input bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12 rounded-lg border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-12 rounded-lg border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-semibold text-white transition active:scale-[0.98]"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-emerald-400 hover:underline">
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
