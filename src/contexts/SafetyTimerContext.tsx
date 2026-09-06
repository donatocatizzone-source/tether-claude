import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";

// Port of OLD/src/contexts/SafetyTimerContext.tsx (see CLAUDE.md > Ground
// truth). A single global countdown-timer service any active safety mode
// can drive, instead of each screen owning its own setInterval the way
// ActiveTimer.tsx currently does.
interface SafetyTimerState {
  label: string;
  totalSeconds: number;
  secondsLeft: number;
  running: boolean;
}

interface SafetyTimerContextType {
  timer: SafetyTimerState | null;
  startTimer: (label: string, totalSeconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
}

const SafetyTimerContext = createContext<SafetyTimerContextType | null>(null);

export function useSafetyTimer() {
  const ctx = useContext(SafetyTimerContext);
  if (!ctx) throw new Error("useSafetyTimer must be used within SafetyTimerProvider");
  return ctx;
}

export function SafetyTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<SafetyTimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInt = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    clearInt();
    if (timer?.running && timer.secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (!prev) return null;
          if (prev.secondsLeft <= 1) {
            clearInt();
            return { ...prev, secondsLeft: 0, running: false };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return clearInt;
  }, [timer?.running]);

  const startTimer = useCallback((label: string, totalSeconds: number) => {
    setTimer({ label, totalSeconds, secondsLeft: totalSeconds, running: true });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => (prev ? { ...prev, running: false } : null));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => (prev && prev.secondsLeft > 0 ? { ...prev, running: true } : prev));
  }, []);

  const stopTimer = useCallback(() => {
    clearInt();
    setTimer(null);
  }, []);

  return (
    <SafetyTimerContext.Provider value={{ timer, startTimer, pauseTimer, resumeTimer, stopTimer }}>
      {children}
    </SafetyTimerContext.Provider>
  );
}
