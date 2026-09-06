import { useNavigate } from "react-router-dom";
import { Menu, Shield, ShieldCheck, Users, Star, Check, Heart, Car, ShoppingBag, GraduationCap } from "lucide-react";
import { useMenuDrawer } from "@/components/layout/MenuDrawerContext";

// Faithful port of reference/tether-app-demo.html #screen-home (~line 305).
// Light theme is intentional here — it's the one screen in the demo that
// stays light; most "active session" screens (dating, active-timer, market,
// premium, vault, guardian) switch to dark. See CLAUDE.md > Screen Inventory.
// Routes are prefixed with /consumer now that this sits under ConsumerPage's
// nested routing (see CLAUDE.md > Architecture) — workspace switching moved
// to TopBar (rendered by ConsumerPage), so the header is back to its
// original 2-slot layout instead of the 3-slot one that held the retired
// WorkspaceToggle.
export default function Home() {
  const navigate = useNavigate();
  const { openMenu } = useMenuDrawer();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card p-6 pb-6 pt-8 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition hover:brightness-95"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-blue-100 text-2xl shadow">
              👨🏻
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-blue-500 text-white shadow-sm">
              <Check className="h-3 w-3" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold">Hello, Gabe</h2>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <p className="text-xs font-medium text-muted-foreground">Protection is currently inactive</p>
        </div>
      </header>

      <div className="p-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-xl">
          <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-5">
            <ShieldCheck className="h-32 w-32 text-foreground" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">System Online</span>
            </div>
            <h3 className="mb-6 text-2xl font-bold tracking-tight">You are Safe</h3>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/consumer/circle")}
                className="rounded-xl border border-border bg-muted p-3 text-left transition hover:brightness-95"
              >
                <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Safety Circle</div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Users className="h-3 w-3" /> 3 Active
                </div>
              </button>
              <button
                onClick={() => navigate("/consumer/vouch")}
                className="rounded-xl border border-border bg-muted p-3 text-left transition hover:brightness-95"
              >
                <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Vouch Score</div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Star className="h-3 w-3 fill-current text-yellow-400" /> 98/100
                </div>
              </button>
            </div>

            <button
              onClick={() => navigate("/consumer/active-timer")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-4 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-95 hover:shadow-xl"
            >
              <span className="rounded-full bg-white/20 p-1">
                <Shield className="h-4 w-4 fill-current" />
              </span>
              Arm Safety Tether
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-28">
        <div className="grid grid-cols-2 gap-4">
          <ModeCard
            onClick={() => navigate("/consumer/mode/dating")}
            icon={Heart}
            iconClass="bg-pink-50 text-pink-500 group-hover:bg-pink-100"
            hoverBorder="hover:border-pink-200"
            title="Dating"
            subtitle="Meetings & Dates"
          />
          <ModeCard
            onClick={() => navigate("/consumer/mode/ride")}
            icon={Car}
            iconClass="bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"
            hoverBorder="hover:border-indigo-200"
            title="Ride"
            subtitle="Solo Travel"
          />
          <ModeCard
            onClick={() => navigate("/consumer/mode/market")}
            icon={ShoppingBag}
            iconClass="bg-sky-50 text-sky-500 group-hover:bg-sky-100"
            hoverBorder="hover:border-sky-200"
            title="Marketplace"
            subtitle="Buying & Selling"
          />
          <ModeCard
            onClick={() => navigate("/consumer/mode/student")}
            icon={GraduationCap}
            iconClass="bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100"
            hoverBorder="hover:border-emerald-200"
            title="Student"
            subtitle="Campus Safety"
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  onClick,
  icon: Icon,
  iconClass,
  hoverBorder,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: typeof Heart;
  iconClass: string;
  hoverBorder: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition active:scale-95 ${hoverBorder}`}
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-bold text-foreground">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>
    </button>
  );
}
