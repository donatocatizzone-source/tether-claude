import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Mail, Loader2, Copy, Check } from "lucide-react";

// Port of OLD/src/components/tether/overwatch/InviteTeamModal.tsx (see
// CLAUDE.md > Ground truth). Creates an org_invitations row; the link
// points at /auth?invite=<token>, matching AuthPage's invite pre-fill
// lookup and handle_invitation_on_signup()'s auto-accept trigger.
interface Props {
  open: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

const roleOptions = [
  { value: "user", label: "Team Member" },
  { value: "security_guard", label: "Security Guard" },
  { value: "manager", label: "Manager" },
];

export function InviteTeamModal({ open, onClose, onInviteSent }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!user || !email.trim()) return;
    setSending(true);

    try {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();

      if (!profile?.organization_id) {
        toast.error("You must belong to an organization to invite members");
        return;
      }

      const { data, error } = await supabase
        .from("org_invitations")
        .insert({
          organization_id: profile.organization_id,
          email: email.trim().toLowerCase(),
          role: role as "user" | "admin" | "security_guard" | "manager",
          invited_by: user.id,
        })
        .select("token")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/auth?invite=${data.token}`;
      setInviteLink(link);
      toast.success(`Invitation created for ${email.trim()}`);
      onInviteSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail("");
    setRole("user");
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mail size={18} /> Invite Team Member
          </DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email Address</Label>
              <Input
                type="email"
                placeholder="team.member@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border bg-secondary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-background">
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending || !email.trim()}>
                {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Mail size={16} className="mr-2" />}
                {sending ? "Sending..." : "Create Invite"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong className="text-foreground">{email}</strong>. When they sign up using this link, they'll automatically join your
              organization.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="border-border bg-secondary text-xs text-foreground" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InviteTeamModal;
