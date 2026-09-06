import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Port of OLD/src/components/tether/pro/SessionEndScreen.tsx (see
// CLAUDE.md > Ground truth). Always shows "Session Ended" in green —
// identical for both a normal end and a duress end — so an aggressor
// watching the screen sees nothing suspicious.
export function SessionEndScreen({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center px-5">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mode-safe/20">
          <CheckCircle size={40} className="text-mode-safe" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Session Ended</h2>
        <p className="text-sm text-muted-foreground">All clear. Stay safe out there.</p>
        <Button onClick={onDone} className="mt-4 rounded-2xl bg-secondary px-8 text-foreground hover:bg-accent">
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}

export default SessionEndScreen;
