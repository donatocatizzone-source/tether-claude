import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, Users, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuDrawerProvider } from "@/components/layout/MenuDrawerContext";
import { MenuDrawer } from "@/components/layout/MenuDrawer";
import { WorkspaceProvider } from "@/components/layout/WorkspaceContext";

// Port of reference/tether-app-demo.html #bottom-nav (~line 279): four nav
// buttons plus a floating center shield button that opens Active Timer.
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/active-timer", label: "Active", icon: Clock },
  { to: "/circle", label: "Circle", icon: Users },
  { to: "/settings", label: "More", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <WorkspaceProvider>
      <MenuDrawerProvider>
        <div className="min-h-screen w-full bg-background pb-24">
          {children}

          <MenuDrawer />

          <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-24 max-w-md items-start justify-around rounded-t-[40px] border-t border-slate-100 bg-white px-2 pt-4">
            <NavItem {...NAV_ITEMS[0]} />
            <NavItem {...NAV_ITEMS[1]} />
            <div className="w-16" /> {/* spacer for the floating button */}
            <NavItem {...NAV_ITEMS[2]} />
            <NavItem {...NAV_ITEMS[3]} />

            <button
              onClick={() => navigate("/active-timer")}
              className="absolute -top-8 left-1/2 flex h-16 w-16 -translate-x-1/2 transform items-center justify-center rounded-full border-4 border-slate-50 bg-slate-900 shadow-2xl transition hover:scale-110 active:scale-95"
            >
              <Shield className="h-7 w-7 text-white" />
            </button>
          </nav>
        </div>
      </MenuDrawerProvider>
    </WorkspaceProvider>
  );
}

function NavItem({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex w-16 flex-col items-center rounded-lg p-2 text-[10px] font-medium transition hover:bg-slate-50",
          isActive ? "text-[#4292c6]" : "text-slate-400 hover:text-slate-600",
        )
      }
    >
      <Icon className="mb-1 h-6 w-6" />
      {label}
    </NavLink>
  );
}
