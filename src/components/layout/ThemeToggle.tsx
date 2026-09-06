import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

// New structural addition (not a port) — see CLAUDE.md: no dark/light
// toggle existed in the original, every screen's theme was hardcoded.
// active-timer/dating/market/premium/vault/guardian (and the B2B trio,
// which shares that same "dark professional workspace" identity) stay
// hardcoded dark regardless of this toggle — see CLAUDE.md's dark/light
// mode section for the reasoning.
export function ThemeToggle({ fullWidth = false }: { fullWidth?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid a flash of the wrong active segment before next-themes reads
  // localStorage on mount.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className={cn("inline-flex items-center rounded-full bg-slate-800 p-1", fullWidth && "flex w-full")}>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
          fullWidth && "flex-1",
          theme === "light" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white",
        )}
      >
        <Sun className="h-3.5 w-3.5" /> Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
          fullWidth && "flex-1",
          theme === "dark" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white",
        )}
      >
        <Moon className="h-3.5 w-3.5" /> Dark
      </button>
    </div>
  );
}
