import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, Users, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuDrawerProvider } from "@/components/layout/MenuDrawerContext";
import { MenuDrawer } from "@/components/layout/MenuDrawer";

// Port of reference/tether-app-demo.html #bottom-nav (~line 279): four nav
// buttons plus a floating center shield button that opens Active Timer.
// Consumer-only chrome now — see CLAUDE.md > Architecture: this only wraps
// ConsumerPage's own content, not the business workspaces (which use TopBar
// only, no bottom tab bar, matching OLD). Paths are relative to /consumer.
const NAV_ITEMS = [
  { to: "/consumer", label: "Home", icon: Home },
  { to: "/consumer/active-timer", label: "Active", icon: Clock },
  { to: "/consumer/circle", label: "Circle", icon: Users },
  { to: "/consumer/settings", label: "More", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <MenuDrawerProvider>
      <div className="w-full bg-background md:flex md:items-stretch">
        {/* Desktop nav rail — replaces the mobile bottom tab bar at md:+,
            same pattern as OverwatchSidebar/OverwatchDashboard's responsive
            sidebar on the B2B side. */}
        <aside className="hidden md:flex md:w-20 md:flex-shrink-0 md:flex-col md:items-center md:gap-1 md:border-r md:border-border md:bg-card md:py-6 lg:w-52 lg:items-stretch lg:px-3">
          <RailItem {...NAV_ITEMS[0]} />
          <RailItem {...NAV_ITEMS[1]} />
          <RailItem {...NAV_ITEMS[2]} />
          <RailItem {...NAV_ITEMS[3]} />
          <button
            onClick={() => navigate("/consumer/active-timer")}
            className="mt-2 flex items-center gap-3 rounded-lg bg-foreground px-3 py-2.5 text-background transition hover:opacity-90 lg:justify-start"
          >
            <Shield className="h-5 w-5 flex-shrink-0" />
            <span className="hidden text-sm font-semibold lg:inline">Arm Tether</span>
          </button>
        </aside>

        <div className="min-h-screen w-full min-w-0 pb-24 md:flex-1 md:pb-0">{children}</div>

        <MenuDrawer />

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-20 max-w-md items-start justify-around border-t border-border bg-card px-2 pt-3 md:hidden">
          <NavItem {...NAV_ITEMS[0]} />
          <NavItem {...NAV_ITEMS[1]} />
          <div className="w-16" /> {/* spacer for the floating button */}
          <NavItem {...NAV_ITEMS[2]} />
          <NavItem {...NAV_ITEMS[3]} />

          <button
            onClick={() => navigate("/consumer/active-timer")}
            className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 transform items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md transition active:scale-95"
          >
            <Shield className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </MenuDrawerProvider>
  );
}

function NavItem({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/consumer"}
      className={({ isActive }) =>
        cn(
          "flex w-16 flex-col items-center rounded-md p-2 text-[10px] font-medium transition hover:bg-accent",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <Icon className="mb-1 h-5 w-5" />
      {label}
    </NavLink>
  );
}

function RailItem({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/consumer"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:justify-start",
          isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}
