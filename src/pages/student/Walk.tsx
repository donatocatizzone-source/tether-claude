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
    <div className="relative flex min-h-screen flex-col bg-background p-6 pt-12">
      <div className="mb-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/consumer")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Walk Home</h2>
          <p className="text-xs text-muted-foreground">Timer Active</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center pb-20">
        <div
          className={cn(
            "relative mb-10 flex h-56 w-56 flex-col items-center justify-center rounded-full border-8 bg-card shadow-md transition-all duration-500",
            deviated ? "border-mode-danger/40" : "border-border",
          )}
        >
          <div
            className={cn(
              "absolute -top-2 left-1/2 -translate-x-1/2 transform rounded-full px-3 py-1 text-[10px] font-bold tracking-wide",
              deviated ? "animate-pulse bg-mode-danger/15 text-mode-danger" : "bg-muted text-mode-safe",
            )}
          >
            {deviated ? "OFF ROUTE" : "SAFE PASSAGE"}
          </div>
          <span
            className={cn(
              "font-mono-data text-4xl font-bold tracking-tighter transition-colors duration-500",
              deviated ? "text-mode-danger" : "text-mode-safe",
            )}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">To Home</span>
        </div>

        <div className="mb-4 w-full rounded-lg border border-border bg-card p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-mode-safe" />
              <span className="text-sm font-bold text-foreground">Destination: Home</span>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-mode-safe transition-all duration-1000"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-right text-[11px] font-medium text-muted-foreground">0.4 miles remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-24">
        <button
          onClick={startWalkSim}
          className="w-full rounded-lg bg-mode-safe py-4 text-xs font-bold text-foreground shadow-md transition hover:bg-mode-safe"
        >
          Start Walk
        </button>
        <button
          onClick={runWalkDeviation}
          className="w-full rounded-lg bg-mode-danger py-4 text-xs font-bold text-foreground shadow-md transition hover:bg-mode-danger"
        >
          Simulate Deviation
        </button>
      </div>
    </div>
  );
}
