import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, PhoneCall, Home as HomeIcon } from "lucide-react";
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
    <div className="relative min-h-screen bg-slate-900 p-6 text-white">
      <div className="absolute left-6 right-6 top-0 z-20 mt-8 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="rounded-full bg-slate-800 p-2 transition hover:bg-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold">Dating Mode</h2>
          <p className="text-xs text-slate-400">Monitoring meeting with "Gabe"</p>
        </div>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center pb-20 pt-24">
        <div className="mb-12 w-full rounded-3xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-bold tracking-wide text-green-400">PROTECTION ACTIVE</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            If your phone disconnects or leaves the 500ft geofence, we will alert your sister automatically.
          </p>
        </div>

        <div className="flex w-full flex-col items-center text-center">
          <button
            onClick={triggerFakeCall}
            className={cn(
              "group flex h-48 w-48 flex-col items-center justify-center rounded-full border border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-[0_0_60px_-10px_rgba(239,68,68,0.6)]",
              pulsing && "animate-pulse",
            )}
          >
            <PhoneCall className="mb-3 h-12 w-12 transition-transform group-hover:rotate-12" />
            <span className="text-sm font-bold uppercase tracking-wide">Get Out</span>
          </button>
          <p className="mt-8 text-xs font-medium text-slate-500">Tap to trigger discreet fake call (3s delay)</p>
        </div>
      </div>

      {incoming && (
        <div className="absolute inset-0 z-50 bg-slate-900 bg-cover bg-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 pt-24">
            <div className="flex flex-col items-center">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 shadow-2xl">
                <HomeIcon className="h-12 w-12 text-slate-900" />
              </div>
              <h2 className="text-3xl font-bold">Landlord</h2>
              <p className="mt-1 text-lg text-white/70">Mobile</p>
            </div>
            <div className="mb-12 flex items-end justify-between px-4">
              <button onClick={() => setIncoming(false)} className="group flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-3xl shadow-lg transition group-active:scale-95">
                  ✕
                </div>
                <span className="text-sm font-medium">Decline</span>
              </button>
              <button onClick={() => setIncoming(false)} className="group flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-3xl shadow-lg transition group-active:scale-95">
                  📞
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
