import { useNavigate } from "react-router-dom";
import { Menu, Shield, Users, Star, Check, Heart, Car, ShoppingBag, GraduationCap } from "lucide-react";
import { useMenuDrawer } from "@/components/layout/MenuDrawerContext";
import { PageContainer } from "@/components/layout/PageContainer";

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
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <PageContainer wide className="flex items-center justify-between py-4">
          <button
            onClick={openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition hover:brightness-95"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h2 className="text-right text-lg font-bold leading-tight">Hello, Gabe</h2>
            <div className="mt-0.5 flex items-center justify-end gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Protection inactive</p>
            </div>
          </div>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
              G
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
              <Check className="h-2.5 w-2.5" />
            </div>
          </div>
        </PageContainer>
      </header>

      <PageContainer wide className="py-6">
        <div className="lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mode-safe" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-mode-safe">System Online</span>
            </div>
            <h3 className="mb-6 text-2xl font-bold tracking-tight">You are Safe</h3>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/consumer/circle")}
                className="rounded-lg border border-border bg-muted p-3 text-left transition hover:brightness-95"
              >
                <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Safety Circle</div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Users className="h-3 w-3" /> 3 Active
                </div>
              </button>
              <button
                onClick={() => navigate("/consumer/vouch")}
                className="rounded-lg border border-border bg-muted p-3 text-left transition hover:brightness-95"
              >
                <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Vouch Score</div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Star className="h-3 w-3 fill-current text-mode-active" /> 98/100
                </div>
              </button>
            </div>

            <button
              onClick={() => navigate("/consumer/active-timer")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient py-3.5 font-bold text-white transition active:scale-[0.98]"
            >
              <Shield className="h-4 w-4 fill-current" />
              Arm Safety Tether
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:mt-0">
            <ModeCard
              onClick={() => navigate("/consumer/mode/dating")}
              icon={Heart}
              iconClass="bg-mode-dating/10 text-mode-dating"
              title="Dating"
              subtitle="Meetings & Dates"
            />
            <ModeCard
              onClick={() => navigate("/consumer/mode/ride")}
              icon={Car}
              iconClass="bg-mode-ride/10 text-mode-ride"
              title="Ride"
              subtitle="Solo Travel"
            />
            <ModeCard
              onClick={() => navigate("/consumer/mode/market")}
              icon={ShoppingBag}
              iconClass="bg-mode-active/10 text-mode-active"
              title="Marketplace"
              subtitle="Buying & Selling"
            />
            <ModeCard
              onClick={() => navigate("/consumer/mode/student")}
              icon={GraduationCap}
              iconClass="bg-mode-safe/10 text-mode-safe"
              title="Student"
              subtitle="Campus Safety"
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

function ModeCard({
  onClick,
  icon: Icon,
  iconClass,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: typeof Heart;
  iconClass: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-foreground/20 active:scale-[0.98]"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-bold text-foreground">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>
    </button>
  );
}
