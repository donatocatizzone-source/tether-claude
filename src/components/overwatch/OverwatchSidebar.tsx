import { LayoutDashboard, Users, Shield, LogOut, Radio, Briefcase, AlertTriangle, FileText, Mail, BarChart3, Building2, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Port of OLD/src/components/tether/overwatch/OverwatchSidebar.tsx (see
// CLAUDE.md > Ground truth).
interface OverwatchSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "properties", label: "Properties", Icon: Building2 },
  { id: "schedule", label: "Schedule", Icon: CalendarDays },
  { id: "incidents", label: "Incidents", Icon: AlertTriangle },
  { id: "audit-log", label: "Audit Log", Icon: FileText },
  { id: "pro-guard", label: "Pro Guard", Icon: Briefcase },
  { id: "live", label: "Live Sessions", Icon: Radio },
  { id: "team", label: "Team", Icon: Users },
  { id: "invitations", label: "Invitations", Icon: Mail },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
] as const;

export function OverwatchSidebar({ activeView, onViewChange }: OverwatchSidebarProps) {
  const { signOut } = useAuth();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-500">
          <Shield size={18} className="text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">Tether</p>
          <p className="text-[10px] text-muted-foreground">Overwatch</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default OverwatchSidebar;
