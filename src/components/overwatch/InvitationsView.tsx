import { useState, useEffect } from "react";
import { Mail, Clock, CheckCircle2, XCircle, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { InviteTeamModal } from "@/components/overwatch/InviteTeamModal";

// Port of OLD/src/components/tether/overwatch/InvitationsView.tsx (see
// CLAUDE.md > Ground truth).
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-amber-500/15 text-amber-400", label: "Pending" },
  accepted: { icon: CheckCircle2, color: "bg-primary/15 text-primary", label: "Accepted" },
  expired: { icon: XCircle, color: "bg-muted text-muted-foreground", label: "Expired" },
};

const roleLabels: Record<string, string> = {
  user: "Team Member",
  security_guard: "Security Guard",
  manager: "Manager",
  admin: "Admin",
};

export function InvitationsView() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchInvitations = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("org_invitations").select("id, email, role, status, created_at, expires_at").order("created_at", { ascending: false });
    setInvitations((data as Invitation[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invitations</h1>
          <p className="text-sm text-muted-foreground">Manage team member invitations</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-2" /> Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invitations.length === 0 ? (
        <Card className="border-border bg-secondary">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Mail size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invitations yet</p>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <Plus size={14} className="mr-2" /> Send First Invite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
            const displayStatus = isExpired ? "expired" : inv.status;
            const displayConfig = statusConfig[displayStatus] || statusConfig.pending;
            const DisplayIcon = displayConfig.icon;

            return (
              <Card key={inv.id} className="border-border bg-secondary">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${displayConfig.color}`}>
                    <DisplayIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[inv.role] || inv.role} · Sent {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={`text-xs ${displayConfig.color}`}>{displayConfig.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InviteTeamModal open={modalOpen} onClose={() => setModalOpen(false)} onInviteSent={fetchInvitations} />
    </div>
  );
}

export default InvitationsView;
