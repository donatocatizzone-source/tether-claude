import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Port of reference/tether-app-demo.html #screen-student-walk (~line 697)
// + startWalkSim()/runWalkDeviation()/resetWalkSim() (~line 1777). The
// original fast-forwards a 15-minute countdown by 60s every 200ms.
const TOTAL_SECONDS = 15 * 60;

export default function StudentWalk() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [deviated, setDeviated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function resetWalkSim() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(TOTAL_SECONDS);
  }

  function startWalkSim() {
    resetWalkSim();
    setDeviated(false);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 60;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          toast.success("Safely Arrived Home");
          return 0;
        }
        return next;
      });
    }, 200);
  }

  function runWalkDeviation() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDeviated(true);
    toast.error("ROUTE DEVIATION DETECTED");
  }

  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const percent = ((TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS) * 100;

  return (
    <div className="relative flex min-h-screen flex-col bg-emerald-50 p-6 pt-12">
      <div className="mb-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-emerald-900" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-emerald-900">Walk Home</h2>
          <p className="text-xs text-emerald-700">Timer Active</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center pb-20">
        <div
          className={cn(
            "relative mb-10 flex h-56 w-56 flex-col items-center justify-center rounded-full border-8 bg-white shadow-2xl transition-all duration-500",
            deviated ? "border-red-200" : "border-emerald-200",
          )}
        >
          <div
            className={cn(
              "absolute -top-2 left-1/2 -translate-x-1/2 transform rounded-full px-3 py-1 text-[10px] font-bold tracking-wide",
              deviated ? "animate-pulse bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
            )}
          >
            {deviated ? "OFF ROUTE" : "SAFE PASSAGE"}
          </div>
          <span
            className={cn(
              "font-mono-data text-4xl font-bold tracking-tighter transition-colors duration-500",
              deviated ? "text-red-600" : "text-emerald-600",
            )}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase text-slate-400">To Home</span>
        </div>

        <div className="mb-4 w-full rounded-2xl border border-emerald-100 bg-white p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700">Destination: Home</span>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-right text-[11px] font-medium text-slate-400">0.4 miles remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-24">
        <button
          onClick={startWalkSim}
          className="w-full rounded-2xl bg-emerald-600 py-4 text-xs font-bold text-white shadow-xl transition hover:bg-emerald-700"
        >
          Start Walk
        </button>
        <button
          onClick={runWalkDeviation}
          className="w-full rounded-2xl bg-red-500 py-4 text-xs font-bold text-white shadow-xl transition hover:bg-red-600"
        >
          Simulate Deviation
        </button>
      </div>
    </div>
  );
}
