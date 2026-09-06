import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  X,
  PhoneCall,
  ChevronRight,
  Users,
  Eye,
  ShieldCheck,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuDrawer } from "@/components/layout/MenuDrawerContext";

// Port of reference/tether-app-demo.html #menu-drawer (~line 204). The
// original's one-way "Switch to Professional" button and its own
// light/dark toggle now live in TopBar's WorkspaceSwitcher/ThemeToggle
// instead (see CLAUDE.md > Ground truth — TopBar is OLD's real pattern,
// rendered above every workspace). The original's openPaySheet() calls
// (Billing & Plans, Upgrade to Premium) point at the payment sheet, which
// CLAUDE.md documents as separately not-yet-ported app chrome — those show
// a placeholder toast here rather than silently growing this change into
// building that sheet too.
export function MenuDrawer() {
  const { isOpen, closeMenu } = useMenuDrawer();
  const navigate = useNavigate();

  function go(path: string) {
    navigate(path);
    closeMenu();
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/50 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMenu}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-sm transform flex-col bg-background transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-6 pt-16">
          <h2 className="text-xl font-bold text-foreground">Menu</h2>
          <button onClick={closeMenu} className="rounded-full bg-background p-2 text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Premium Features
          </div>

          <button
            onClick={() => go("/consumer/premium/dispatch")}
            className="group flex w-full items-center gap-4 rounded-xl bg-background/50 p-4 text-foreground transition hover:bg-background"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mode-danger/20 text-mode-danger transition group-hover:bg-mode-danger group-hover:text-foreground">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Live 911 Dispatch</div>
              <div className="text-xs text-muted-foreground">Direct API connection</div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>

          <div className="group flex w-full flex-col gap-3 rounded-xl bg-background/50 p-4 text-foreground transition hover:bg-background">
            <button onClick={() => go("/consumer/premium/guardian")} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mode-safe/20 text-mode-safe transition group-hover:bg-mode-safe group-hover:text-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold">Guardian Dashboard</div>
                <div className="text-xs text-muted-foreground">Parental controls</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => go("/consumer/guardian")}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-mode-safe/40/30 bg-mode-safe/10 py-2 text-xs font-bold text-mode-safe transition hover:bg-mode-safe/20"
            >
              <Eye className="h-3 w-3" /> See Preview
            </button>
          </div>

          <button
            onClick={() => go("/consumer/premium/badge")}
            className="group flex w-full items-center gap-4 rounded-xl bg-background/50 p-4 text-foreground transition hover:bg-background"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mode-ride/20 text-mode-ride transition group-hover:bg-mode-ride group-hover:text-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Vouch Badge</div>
              <div className="text-xs text-muted-foreground">Verified ID Status</div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>

          <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</div>
          <button
            onClick={() => toast("Billing & Plans coming soon")}
            className="flex w-full items-center gap-3 p-3 text-muted-foreground hover:text-foreground"
          >
            <CreditCard className="h-5 w-5" /> Billing &amp; Plans
          </button>
          <button
            onClick={() => go("/consumer/settings")}
            className="flex w-full items-center gap-3 p-3 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-5 w-5" /> App Settings
          </button>
        </div>

        <div className="border-t border-border p-6">
          <button
            onClick={() => toast("Billing & Plans coming soon")}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 py-3 font-bold text-foreground shadow-lg"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    </>
  );
}
