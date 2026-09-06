import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, PhoneCall, Home as HomeIcon, Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Port of reference/tether-app-demo.html #screen-dating +
// triggerFakeCall()/resetFakeCall() (~line 1170 / ~1635).
export default function DatingMode() {
  const navigate = useNavigate();
  const [pulsing, setPulsing] = useState(false);
  const [incoming, setIncoming] = useState(false);

  const triggerFakeCall = () => {
    toast.info("Discreet signal sent...");
    setPulsing(true);
    setTimeout(() => {
      setIncoming(true);
      setPulsing(false);
    }, 3000);
  };

  return (
    <div className="relative min-h-screen bg-background p-6 text-foreground">
      <div className="absolute left-6 right-6 top-0 z-20 mt-8 flex items-center gap-3">
        <button onClick={() => navigate("/consumer")} className="rounded-full bg-background p-2 transition hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold">Dating Mode</h2>
          <p className="text-xs text-muted-foreground">Monitoring meeting with "Gabe"</p>
        </div>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center pb-20 pt-24">
        <div className="mb-12 w-full rounded-lg border border-border bg-background/50 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-mode-safe" />
            <span className="text-xs font-bold tracking-wide text-mode-safe">PROTECTION ACTIVE</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If your phone disconnects or leaves the 500ft geofence, we will alert your sister automatically.
          </p>
        </div>

        <div className="flex w-full flex-col items-center text-center">
          <button
            onClick={triggerFakeCall}
            className={cn(
              "group flex h-48 w-48 flex-col items-center justify-center rounded-full border border-mode-danger/40 bg-mode-danger/10 text-mode-danger shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] transition-all duration-300 hover:bg-mode-danger hover:text-foreground hover:shadow-[0_0_60px_-10px_rgba(239,68,68,0.6)]",
              pulsing && "animate-pulse",
            )}
          >
            <PhoneCall className="mb-3 h-12 w-12 transition-transform group-hover:rotate-12" />
            <span className="text-sm font-bold uppercase tracking-wide">Get Out</span>
          </button>
          <p className="mt-8 text-xs font-medium text-muted-foreground">Tap to trigger discreet fake call (3s delay)</p>
        </div>
      </div>

      {incoming && (
        <div className="absolute inset-0 z-50 bg-background bg-cover bg-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 pt-24">
            <div className="flex flex-col items-center">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-muted shadow-md">
                <HomeIcon className="h-12 w-12 text-foreground" />
              </div>
              <h2 className="text-3xl font-bold">Landlord</h2>
              <p className="mt-1 text-lg text-foreground/70">Mobile</p>
            </div>
            <div className="mb-12 flex items-end justify-between px-4">
              <button onClick={() => setIncoming(false)} className="group flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mode-danger text-3xl shadow-lg transition group-active:scale-95">
                  <PhoneOff className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Decline</span>
              </button>
              <button onClick={() => setIncoming(false)} className="group flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mode-safe text-3xl shadow-lg transition group-active:scale-95">
                  <Phone className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
