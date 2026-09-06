import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// Self-serve organisation creation, at /business/new.
//
// Routed inside ProtectedRoute but deliberately OUTSIDE RequireWorkspace:
// that guard bounces org-less users away from /business/*, which is exactly
// the audience for this page. Putting it behind the guard would make it
// unreachable by everyone who needs it.
//
// The write goes through the create_organization RPC because it spans
// organizations + profiles + user_roles and must be atomic — see
// supabase/migrations/0002_org_self_serve.sql.
export default function CreateOrganizationPage() {
  const { user } = useAuth();
  const { setMode } = useWorkspace();
  const { hasOrganization, loading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Give your brokerage a name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_organization", {
        _name: name.trim(),
        _job_title: jobTitle.trim(),
      });
      if (error) throw error;

      // useProfile caches for 5 minutes, so without this the app would keep
      // reporting hasOrganization: false and the workspace would stay locked.
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

      setMode("admin");
      toast.success(`${name.trim()} created`, { description: "You're the admin of this brokerage." });
      navigate("/business/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the brokerage");
    } finally {
      setSaving(false);
    }
  }

  // Someone who already has an org shouldn't be offered a second one — the
  // RPC would reject it anyway, but saying so up front is clearer than
  // letting them fill in a form that can only fail.
  if (!profileLoading && hasOrganization) {
    return (
      <PageContainer className="py-16">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Check className="mx-auto mb-3 h-7 w-7 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">You're already in a brokerage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch to it from the workspace menu, or ask an admin to change your role.
          </p>
          <Button onClick={() => navigate("/business/member")} className="mt-5">
            Go to my workspace
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-12">
      <button
        onClick={() => navigate("/consumer")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
          <Building2 size={18} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Create a brokerage</h1>
          <p className="text-sm text-muted-foreground">
            Unlocks the team and manager workspaces for showing safety.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="org-name">Brokerage name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cedar & Vine Realty"
            autoFocus
            required
            minLength={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-title">Your title</Label>
          <Input
            id="job-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Managing Broker"
          />
          <p className="text-xs text-muted-foreground">Optional. Shown to your team in the console.</p>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            You'll be the admin: you can add listings, schedule showings, invite agents, and see live sessions.
            Agents you invite only see their own schedule.
          </p>
        </div>

        <Button type="submit" disabled={saving || name.trim().length < 2} className="w-full">
          {saving ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Building2 size={15} className="mr-2" />}
          {saving ? "Creating…" : "Create brokerage"}
        </Button>
      </form>
    </PageContainer>
  );
}
