import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Users, Shield, HelpCircle, ChevronRight, KeyRound, Building2, LogOut, Mail } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// Port of reference/tether-app-demo.html #screen-settings (~line 920).
//
// The demo's rows were inert placeholders, including "Log Out". The account
// rows are real now — notably sign-out, which previously existed ONLY inside
// the Overwatch sidebar, a screen a consumer-only user can never reach. There
// was no way for most users to sign out of the app at all.
const PLACEHOLDER_SECTIONS = [
  {
    label: "Safety",
    rows: [
      { icon: Users, title: "Manage Circle" },
      { icon: Shield, title: "Privacy & Data" },
    ],
  },
  {
    label: "Notifications",
    rows: [{ icon: Bell, title: "Alerts & Reminders" }],
  },
  {
    label: "Support",
    rows: [{ icon: HelpCircle, title: "Get Help" }],
  },
];

export default function Settings() {
  const { user, signOut, resetPassword } = useAuth();
  const { fullName, hasOrganization } = useProfile();
  const navigate = useNavigate();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function handleChangePassword() {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) toast.error(error.message);
    else toast.success("Check your email", { description: `Reset link sent to ${user.email}.` });
  }

  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="py-8 pb-28">
        <h2 className="mb-6 text-xl font-semibold text-foreground">Settings</h2>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</h3>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {(fullName || user?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{fullName || "Your account"}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Mail size={11} /> {user?.email}
                  </p>
                </div>
              </div>

              <Row icon={KeyRound} title="Change password" onClick={handleChangePassword} />

              {/* Only shown when it would actually do something. */}
              {!hasOrganization && (
                <Row
                  icon={Building2}
                  title="Create a brokerage"
                  subtitle="Unlocks the team and manager workspaces"
                  onClick={() => navigate("/business/new")}
                />
              )}
            </div>
          </section>

          {PLACEHOLDER_SECTIONS.map((section) => (
            <section key={section.label}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h3>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {section.rows.map((row) => (
                  <Row key={row.title} icon={row.icon} title={row.title} />
                ))}
              </div>
            </section>
          ))}

          <button
            onClick={() => setConfirmSignOut(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </PageContainer>

      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Any active safety session keeps running — ending a session is separate from signing out, so your
              contacts are still notified if it expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof User;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between border-b border-border p-4 text-left transition-colors last:border-b-0 enabled:hover:bg-accent disabled:cursor-default disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <span className="text-sm text-foreground">{title}</span>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}
