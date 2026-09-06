import { ChevronDown, Check, Lock, ShieldCheck, UserRound, Building2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { canAccessMode, workspaceLockReason, type WorkspaceMode } from "@/lib/workspace";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Port of OLD/src/components/tether/WorkspaceSwitcher.tsx (see CLAUDE.md >
// Ground truth).
//
// Gated workspaces are rendered disabled with a reason, not filtered out.
// Previously they were removed from the list entirely, so a user without an
// organisation saw a chevron opening onto a single row with no explanation —
// which reads as a broken switcher rather than a restricted one. Emoji icons
// replaced with lucide, matching the rest of the app.
const modeConfig: Record<
  WorkspaceMode,
  { label: string; Icon: typeof ShieldCheck; description: string; route: string }
> = {
  consumer: {
    label: "Personal Safety",
    Icon: ShieldCheck,
    description: "SOS, dating guard, ride tracking",
    route: "/consumer",
  },
  member: {
    label: "Team Member",
    Icon: UserRound,
    description: "Shift status & field safety",
    route: "/business/member",
  },
  admin: {
    label: "Manager Console",
    Icon: Building2,
    description: "Overwatch & incident management",
    route: "/business/admin",
  },
};

const ALL_MODES: WorkspaceMode[] = ["consumer", "member", "admin"];

export function WorkspaceSwitcher() {
  const { currentMode, setMode, hasOrganization, isManager, loading } = useWorkspace();
  const navigate = useNavigate();
  const current = modeConfig[currentMode];
  const access = { hasOrganization, isManager, loading };

  function handleSelect(mode: WorkspaceMode) {
    if (!canAccessMode(mode, access)) return;
    setMode(mode);
    navigate(modeConfig[mode].route);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          <current.Icon size={15} className="text-muted-foreground" />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {ALL_MODES.map((mode) => {
          const config = modeConfig[mode];
          const isActive = currentMode === mode;
          const available = canAccessMode(mode, access);
          const reason = workspaceLockReason(mode, access);

          return (
            <DropdownMenuItem
              key={mode}
              disabled={!available}
              onSelect={(e) => {
                if (!available) e.preventDefault();
                else handleSelect(mode);
              }}
              className={cn("flex items-start gap-3 rounded-md p-2.5", available && "cursor-pointer")}
            >
              <config.Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{config.label}</p>
                <p className="text-xs text-muted-foreground">{reason ?? config.description}</p>
              </div>
              {isActive && <Check size={15} className="mt-0.5 shrink-0 text-primary" />}
              {!available && !isActive && <Lock size={13} className="mt-1 shrink-0 text-muted-foreground" />}
            </DropdownMenuItem>
          );
        })}

        {/* The way out of the locked state. Without this the disabled rows
            explain the problem but offer no fix. */}
        {!loading && !hasOrganization && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate("/business/new")}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2.5"
            >
              <Plus size={16} className="shrink-0 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Create a brokerage</p>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
