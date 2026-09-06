import {
  LayoutDashboard, Users, Shield, LogOut, Radio, Briefcase, AlertTriangle,
  FileText, Mail, BarChart3, Building2, CalendarDays, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Port of OLD/src/components/tether/overwatch/OverwatchSidebar.tsx (see
// CLAUDE.md > Ground truth).
//
// Grouped rather than a flat ten-item list: at that length an ungrouped nav
// stops being scannable, and the sections match how the work actually splits.
// Rows are ~30px instead of ~42px, and the whole rail collapses to icons.
interface OverwatchSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const navGroups = [
  {
    label: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { id: "live", label: "Live Sessions", Icon: Radio },
      { id: "incidents", label: "Incidents", Icon: AlertTriangle },
    ],
  },
  {
    label: "Real estate",
    items: [
      { id: "properties", label: "Properties", Icon: Building2 },
      { id: "schedule", label: "Schedule", Icon: CalendarDays },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "team", label: "Team", Icon: Users },
      { id: "invitations", label: "Invitations", Icon: Mail },
      { id: "pro-guard", label: "Pro Guard", Icon: Briefcase },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "analytics", label: "Analytics", Icon: BarChart3 },
      { id: "audit-log", label: "Audit Log", Icon: FileText },
    ],
  },
] as const;

export function OverwatchSidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapsed,
}: OverwatchSidebarProps) {
  const { signOut } = useAuth();
  const { fullName, organizationId } = useProfile();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-150",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 border-b border-border px-3 py-3",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <Shield size={15} className="text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">Tether</p>
              <p className="truncate text-[11px] text-muted-foreground">Overwatch</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3">
              {/* The group header is what makes ten items scannable, so when
                  collapsed it becomes a rule rather than disappearing —
                  otherwise the icons run together as one undifferentiated list. */}
              {collapsed ? (
                <div className="mx-2 mb-1.5 border-t border-border" />
              ) : (
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeView === item.id;
                  const button = (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent font-medium text-sidebar-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.Icon size={16} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );

                  return collapsed ? (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          {!collapsed && fullName && (
            <div className="mb-1 px-2 py-1">
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">{fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {organizationId ? "Manager" : "No brokerage"}
              </p>
            </div>
          )}

          <button
            onClick={onToggleCollapsed}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && "Collapse"}
          </button>

          <button
            onClick={signOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default OverwatchSidebar;
