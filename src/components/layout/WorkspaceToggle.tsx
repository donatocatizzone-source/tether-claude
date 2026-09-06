import { useNavigate } from "react-router-dom";
import { Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace, type Workspace } from "@/components/layout/WorkspaceContext";

// Shared control shown in the same form on every primary dashboard (Home,
// b2b/Home) and inside the hamburger drawer — see CLAUDE.md's workspace
// toggle section for why this exists as one component rather than three
// bespoke ones.
export function WorkspaceToggle({
  variant = "light",
  fullWidth = false,
  onSelect,
}: {
  variant?: "light" | "dark";
  fullWidth?: boolean;
  /** Called after navigating, e.g. to close a containing drawer. */
  onSelect?: () => void;
}) {
  const { workspace, setWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const isDark = variant === "dark";

  function go(target: Workspace) {
    setWorkspace(target);
    navigate(target === "consumer" ? "/" : "/b2b");
    onSelect?.();
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full p-1",
        isDark ? "bg-slate-800" : "bg-muted",
        fullWidth && "flex w-full",
      )}
    >
      <button
        onClick={() => go("consumer")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
          fullWidth && "flex-1",
          workspace === "consumer"
            ? isDark
              ? "bg-slate-700 text-white shadow"
              : "bg-card text-foreground shadow-sm"
            : isDark
              ? "text-slate-400 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Users className="h-3.5 w-3.5" /> Consumer
      </button>
      <button
        onClick={() => go("professional")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
          fullWidth && "flex-1",
          workspace === "professional"
            ? "bg-yellow-500 text-slate-900 shadow"
            : isDark
              ? "text-slate-400 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Briefcase className="h-3.5 w-3.5" /> Professional
      </button>
    </div>
  );
}
