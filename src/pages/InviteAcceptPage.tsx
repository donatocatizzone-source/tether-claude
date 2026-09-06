import { ScreenStub } from "@/components/layout/ScreenStub";

// Mounted at /invite/:token by App.tsx — a public, no-auth page for
// accepting an org invitation (org_invitations) or a Safety Circle invite
// (circle_invitations). OLD's real version (OLD/src/pages/InviteAcceptPage.tsx)
// looks up the invite by token, shows the inviter's name/org, and either
// prompts sign-up (auto-accepted via handle_invitation_on_signup()) or
// calls accept_circle_invite() directly if already signed in. Not started.
export default function InviteAcceptPage() {
  return (
    <ScreenStub
      eyebrow="Public / Invite"
      title="Accept invitation"
      description="Looks up an org or Safety Circle invite by token and shows the inviter's name before prompting sign-up / accepting. Not started yet."
      specRef="OLD/src/pages/InviteAcceptPage.tsx — see CLAUDE.md > Feature inventory > Safety Circle / Org system"
    />
  );
}
