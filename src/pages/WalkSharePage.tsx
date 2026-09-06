import { ScreenStub } from "@/components/layout/ScreenStub";

// Mounted at /walk/share/:token by App.tsx — a public, no-auth page showing
// a live Walk Home session to whoever holds the link. OLD's real version
// (OLD/src/pages/WalkSharePage.tsx) queries walk_sessions by share_token
// and shows a live-updating map + countdown. Not started yet — this
// rebuild's Walk Home timer (src/pages/student/Walk.tsx) is still purely
// local component state with no walk_sessions row to share.
export default function WalkSharePage() {
  return (
    <ScreenStub
      eyebrow="Public / Walk Share"
      title="Live walk share"
      description="Shows a live-updating map + countdown for a shared Walk Home session, looked up by token. Not started — Walk Home has no walk_sessions row to share yet."
      specRef="OLD/src/pages/WalkSharePage.tsx — see CLAUDE.md > Feature inventory > Student Mode"
    />
  );
}
