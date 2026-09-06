import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-active-timer (~line 1134).
// Circular progress ring counts down from a configurable window; original
// demo hardcodes 29:59 remaining out of a 30-minute check-in window.
const TOTAL_SECONDS = 30 * 60;
const RADIUS = 136;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ActiveTimer() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS - 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = secondsLeft / TOTAL_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground">
      <div className="fixed left-0 top-12 flex w-full justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mode-safe" />
          <span className="text-[10px] font-bold tracking-wide text-mode-safe">GPS MONITORING LIVE</span>
        </div>
      </div>

      <div className="relative mb-16 mt-8">
        <div className="absolute inset-0 animate-pulse rounded-full bg-mode-safe opacity-20 blur-2xl" />
        <svg className="relative z-10 h-72 w-72 -rotate-90 transform">
          <circle cx="144" cy="144" r={RADIUS} stroke="#1e293b" strokeWidth="8" fill="none" />
          <circle
            cx="144"
            cy="144"
            r={RADIUS}
            stroke="#10b981"
            strokeWidth="8"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <span className="font-mono-data text-6xl font-bold tracking-tighter">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Until Alert</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4 px-4">
        <button
          onClick={() => {
            toast.success("Check-in Confirmed. Timer Stopped.");
            navigate("/consumer");
          }}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-mode-safe py-4 font-bold shadow-lg shadow-emerald-900/50 transition hover:bg-mode-safe"
        >
          <CheckCircle2 className="h-5 w-5 transition group-hover:scale-110" />
          I'M SAFE
        </button>
        <button
          onClick={() => toast.error("SOS Triggered: Police Notified")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-4 text-xs font-bold text-mode-danger transition hover:border-mode-danger/40/50 hover:bg-mode-danger/20"
        >
          <AlertTriangle className="h-4 w-4" />
          TRIGGER SOS
        </button>
      </div>
    </div>
  );
}
