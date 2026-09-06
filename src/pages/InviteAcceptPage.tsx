import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, LogIn, UserX, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// Public page at /invite/:token. Replaces a ScreenStub.
//
// Everything here goes through two security-definer RPCs. The table's blanket
// `for select using (true)` policy is dropped in 0004 — it let anyone with the
// anon key enumerate every invitee email, role, org id and token.
//
// get_invitation_preview() is callable signed out and returns a MASKED email,
// enough for someone to recognise whether an invite is theirs without a
// forwarded link disclosing a full address.

interface Preview {
  organization_name: string | null;
  email_masked: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  user: "Team member",
  manager: "Manager",
  admin: "Admin",
  security_guard: "Security guard",
};

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user, signOut } = useAuth();
  const { setMode } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("get_invitation_preview", { _token: token });
      setPreview((data as unknown as Preview) ?? null);
      setLoading(false);
    })();
  }, [token]);

  async function handleJoin() {
    if (!token) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("accept_org_invitation", { _token: token });
      if (error) throw error;

      const result = data as unknown as { organization_name: string; role: string };
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

      setMode(result.role === "manager" || result.role === "admin" ? "admin" : "member");
      toast.success(`Joined ${result.organization_name}`);
      navigate(result.role === "manager" || result.role === "admin" ? "/business/admin" : "/business/member");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept the invitation");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Unknown, expired and already-accepted tokens all land here — the RPC
  // returns null for all three, so this page can't be used to probe which
  // invitations exist.
  if (!preview) {
    return (
      <PageContainer className="flex min-h-screen flex-col items-center justify-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">This invitation isn't active</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          It may have expired, already been used, or been replaced. Ask whoever invited you for a fresh link.
        </p>
      </PageContainer>
    );
  }

  const orgName = preview.organization_name ?? "a brokerage";
  const roleLabel = ROLE_LABELS[preview.role] ?? preview.role;

  return (
    <PageContainer className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">{orgName}</h1>
            <p className="text-sm text-muted-foreground">
              invited <span className="text-foreground">{preview.email_masked}</span> as {roleLabel}
            </p>
          </div>
        </div>

        <div className="mt-5">
          {!user ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Sign in or create an account with that email address to join.
              </p>
              <Button
                className="w-full"
                onClick={() => navigate(`/auth?invite=${token}&redirect=/invite/${token}`)}
              >
                <LogIn size={15} className="mr-2" /> Continue
              </Button>
            </>
          ) : (
            <>
              {/* The signed-in-as-someone-else case is called out explicitly.
                  accept_org_invitation() rejects a mismatched email server-side,
                  and failing silently here is how invite flows turn into
                  support tickets. */}
              <p className="mb-3 text-sm text-muted-foreground">
                You're signed in as <span className="text-foreground">{user.email}</span>. If that isn't the
                invited address, sign out and use the invited one.
              </p>
              <Button className="w-full" onClick={handleJoin} disabled={joining}>
                {joining ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Check size={15} className="mr-2" />}
                {joining ? "Joining…" : `Join ${orgName}`}
              </Button>
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={async () => {
                  await signOut();
                  navigate(`/auth?invite=${token}&redirect=/invite/${token}`);
                }}
              >
                <UserX size={15} className="mr-2" /> Sign out and use another account
              </Button>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
