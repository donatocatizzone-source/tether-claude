import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Port of OLD/src/components/tether/pro/PinPadModal.tsx (see CLAUDE.md >
// Ground truth). Entering the duress PIN silently triggers onVerify(true)
// (a duress_alert) while showing the exact same "Session Ended" screen as
// a normal end — see SessionEndScreen.tsx.
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (isDuress: boolean) => void;
}

export function PinPadModal({ open, onOpenChange, onVerify }: Props) {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [safePin, setSafePin] = useState<string | null>(null);
  const [duressPin, setDuressPin] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("safe_word, duress_pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSafePin(data.safe_word || "1234");
        setDuressPin(data.duress_pin_hash || "9911");
      }
    })();
  }, [user, open]);

  const handleDigit = useCallback(
    (d: string) => {
      setError(false);
      setPin((prev) => {
        const next = prev + d;
        if (next.length === 4) {
          setTimeout(() => {
            if (next === duressPin) {
              onVerify(true);
              onOpenChange(false);
            } else if (next === safePin) {
              onVerify(false);
              onOpenChange(false);
            } else {
              setError(true);
              setPin("");
            }
          }, 150);
        }
        return next.length <= 4 ? next : prev;
      });
    },
    [safePin, duressPin, onVerify, onOpenChange],
  );

  const handleDelete = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  useEffect(() => {
    if (open) {
      setPin("");
      setError(false);
    }
  }, [open]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs border-border bg-background p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">Enter PIN to End Session</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center gap-3 py-4">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-colors ${
                pin.length > i
                  ? error
                    ? "border-red-500 bg-red-500"
                    : "border-sky-500 bg-sky-500"
                  : "border-border bg-transparent"
              }`}
              animate={error && pin.length === 0 ? { x: [0, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
        {error && <p className="text-center text-xs text-red-400">Incorrect PIN</p>}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "del") {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="flex h-14 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent"
                >
                  <Delete size={20} />
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="flex h-14 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-semibold text-foreground transition-all hover:bg-accent active:scale-95"
              >
                {d}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PinPadModal;
