import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, StopCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProSessionSetup } from "@/components/pro/ProGuardSetup";
import { PinPadModal } from "@/components/pro/PinPadModal";

// Port of OLD/src/components/tether/pro/ProGuardActive.tsx (see CLAUDE.md >
// Ground truth).
interface Props {
  session: ProSessionSetup;
  onEnd: (duress: boolean) => void;
}

export function ProGuardActive({ session, onEnd }: Props) {
  const [remainingSec, setRemainingSec] = useState(session.durationMin * 60);
  const [extended, setExtended] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const isWarning = remainingSec > 0 && remainingSec <= 300;
  const isExpired = remainingSec === 0;

  const timerColor = isExpired ? "text-red-500" : isWarning ? "text-amber-400" : "text-sky-400";
  const ringColor = isExpired ? "stroke-red-500" : isWarning ? "stroke-amber-400" : "stroke-sky-400";

  const progress = session.durationMin * 60 > 0 ? remainingSec / (session.durationMin * 60) : 0;
  const circumference = 2 * Math.PI * 90;

  const handleExtend = useCallback(() => {
    setRemainingSec((s) => s + 900);
    setExtended(true);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 pb-24">
      <div className="mt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Pro Guard Active</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.clientName} · {session.address || "No location"}
        </p>
      </div>

      <div className="relative mt-8 flex h-52 w-52 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" strokeWidth="6" className="stroke-border" />
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="6"
            className={ringColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 100 100)"
            animate={isExpired ? { opacity: [1, 0.3, 1] } : {}}
            transition={isExpired ? { duration: 1, repeat: Infinity } : {}}
          />
        </svg>
        <div className="text-center">
          <p className={`text-4xl font-bold tabular-nums ${timerColor}`}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isExpired ? "TIME EXPIRED" : isWarning ? "Ending soon" : "Remaining"}
          </p>
        </div>
      </div>

      {isExpired && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center"
        >
          <p className="text-sm font-semibold text-red-400">⚠️ Session expired — check in required</p>
        </motion.div>
      )}

      <div className="mt-8 flex w-full gap-3">
        <Button onClick={handleExtend} variant="outline" className="h-14 flex-1 rounded-2xl border-border text-foreground">
          <Plus size={18} className="mr-2" /> Extend +15m
        </Button>
        <Button
          onClick={() => setPinOpen(true)}
          className="h-14 flex-1 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
        >
          <StopCircle size={18} className="mr-2" /> End Session
        </Button>
      </div>

      <Card className="mt-6 w-full border-border bg-secondary">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            {extended ? "Extended" : `${session.durationMin}m session`}
          </div>
          {session.notes && <p className="mt-2 text-xs text-muted-foreground">{session.notes}</p>}
        </CardContent>
      </Card>

      <PinPadModal open={pinOpen} onOpenChange={setPinOpen} onVerify={onEnd} />
    </div>
  );
}

export default ProGuardActive;
