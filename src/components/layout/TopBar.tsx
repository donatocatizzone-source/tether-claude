import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Port of OLD/src/components/tether/TopBar.tsx (see CLAUDE.md > Ground
// truth) — the persistent header rendered above all three workspaces
// (ConsumerPage, MemberPage, AdminPage). Uses this rebuild's existing
// next-themes-backed ThemeToggle instead of porting OLD's separate
// useTheme hook, since that toggle was already built and approved here.
export function TopBar() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-secondary/80 px-4 py-2 backdrop-blur-md">
      <span className="text-sm font-bold tracking-tight text-foreground">Tether</span>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <WorkspaceSwitcher />
      </div>
    </div>
  );
}
