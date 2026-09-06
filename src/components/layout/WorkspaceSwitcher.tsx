import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useWorkspace, type WorkspaceMode } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";

// Port of OLD/src/components/tether/WorkspaceSwitcher.tsx (see CLAUDE.md >
// Ground truth). Replaces this rebuild's earlier bespoke two-segment
// WorkspaceToggle pill.
const modeConfig: Record<
  WorkspaceMode,
  { label: string; emoji: string; description: string; route: string }
> = {
  consumer: {
    label: "Personal Safety",
    emoji: "🛡️",
    description: "SOS, dating guard, ride tracking",
    route: "/consumer",
  },
  member: {
    label: "Team Member",
    emoji: "👤",
    description: "Shift status & field safety",
    route: "/business/member",
  },
  admin: {
    label: "Manager Console",
    emoji: "🏢",
    description: "Overwatch & incident management",
    route: "/business/admin",
  },
};

export function WorkspaceSwitcher() {
  const { currentMode, setMode, hasOrganization, isManager } = useWorkspace();
  const navigate = useNavigate();
  const current = modeConfig[currentMode];

  function handleSelect(mode: WorkspaceMode) {
    setMode(mode);
    navigate(modeConfig[mode].route);
  }

  const availableModes: WorkspaceMode[] = [
    "consumer",
    ...(hasOrganization ? (["member"] as WorkspaceMode[]) : []),
    ...(isManager ? (["admin"] as WorkspaceMode[]) : []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-95">
          <span className="text-base leading-none">{current.emoji}</span>
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-popover">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableModes.map((mode) => {
          const config = modeConfig[mode];
          const isActive = currentMode === mode;
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => handleSelect(mode)}
              className="flex cursor-pointer items-start gap-3 rounded-lg p-3"
            >
              <span className="mt-0.5 text-lg leading-none">{config.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
              {isActive && <Check size={16} className="mt-1 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
