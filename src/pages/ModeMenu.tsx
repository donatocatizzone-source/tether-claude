import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MODE_MENUS, type ModeKey } from "@/lib/modeMenus";

// Port of reference/tether-app-demo.html #screen-mode-menu +
// openModeMenu() (~line 986 / ~1519). One shared screen, populated per mode
// via MODE_MENUS instead of the original's DOM injection.
export default function ModeMenu() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const config = MODE_MENUS[mode as ModeKey];

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Unknown mode "{mode}".</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 pt-12 text-foreground">
      <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-background py-2">
        <button
          onClick={() => navigate("/consumer")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{config.title}</h2>
          <p className="text-xs text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      {config.connectedApps && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Connected Apps</h3>
          <div className="flex gap-3">
            {config.connectedApps.map((app, i) => (
              <div
                key={i}
                className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${app.bg} ${app.color}`}
              >
                {app.text ? <span className="text-xs font-bold">{app.text}</span> : <app.icon className="h-6 w-6" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pb-24">
        {config.features.map((feat, i) => (
          <button
            key={i}
            onClick={() => (feat.to ? navigate(feat.to) : feat.toast && toast.success(feat.toast))}
            className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-border active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-background group-hover:text-mode-ride">
              <feat.icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
              <p className="text-xs text-muted-foreground">{feat.desc}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-mode-ride" />
          </button>
        ))}
      </div>
    </div>
  );
}
