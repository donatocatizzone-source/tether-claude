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
import { WorkspaceToggle } from "@/components/layout/WorkspaceToggle";

// Port of reference/tether-app-demo.html #menu-drawer (~line 204), with
// one deliberate deviation: the original's one-way "Switch to Professional"
// button is replaced by the shared WorkspaceToggle (see CLAUDE.md's
// workspace toggle section) so switching is bidirectional and consistent
// with Home/b2b-Home. The original's openPaySheet() calls (Billing &
// Plans, Upgrade to Premium) point at the payment sheet, which CLAUDE.md
// documents as separately not-yet-ported app chrome — those show a
// placeholder toast here rather than silently growing this change into
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
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMenu}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-sm transform flex-col bg-slate-900 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-6 pt-16">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <button onClick={closeMenu} className="rounded-full bg-slate-800 p-2 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Workspace</div>
            <WorkspaceToggle variant="dark" fullWidth onSelect={closeMenu} />
          </div>

          <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Premium Features
          </div>

          <button
            onClick={() => go("/premium/dispatch")}
            className="group flex w-full items-center gap-4 rounded-xl bg-slate-800/50 p-4 text-white transition hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition group-hover:bg-red-500 group-hover:text-white">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Live 911 Dispatch</div>
              <div className="text-xs text-slate-400">Direct API connection</div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
          </button>

          <div className="group flex w-full flex-col gap-3 rounded-xl bg-slate-800/50 p-4 text-white transition hover:bg-slate-800">
            <button onClick={() => go("/premium/guardian")} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 transition group-hover:bg-emerald-500 group-hover:text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold">Guardian Dashboard</div>
                <div className="text-xs text-slate-400">Parental controls</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
            <button
              onClick={() => go("/guardian")}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
            >
              <Eye className="h-3 w-3" /> See Preview
            </button>
          </div>

          <button
            onClick={() => go("/premium/badge")}
            className="group flex w-full items-center gap-4 rounded-xl bg-slate-800/50 p-4 text-white transition hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 transition group-hover:bg-blue-500 group-hover:text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Vouch Badge</div>
              <div className="text-xs text-slate-400">Verified ID Status</div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
          </button>

          <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Account</div>
          <button
            onClick={() => toast("Billing & Plans coming soon")}
            className="flex w-full items-center gap-3 p-3 text-slate-300 hover:text-white"
          >
            <CreditCard className="h-5 w-5" /> Billing &amp; Plans
          </button>
          <button
            onClick={() => go("/settings")}
            className="flex w-full items-center gap-3 p-3 text-slate-300 hover:text-white"
          >
            <Settings className="h-5 w-5" /> App Settings
          </button>
        </div>

        <div className="border-t border-slate-800 p-6">
          <button
            onClick={() => toast("Billing & Plans coming soon")}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 py-3 font-bold text-white shadow-lg"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    </>
  );
}
