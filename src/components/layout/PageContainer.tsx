import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Consumer screens were built mobile-first with no max-width, so on a real
// desktop viewport they stretch edge-to-edge (see the desktop-responsive
// pass in CLAUDE.md's build order). This caps content width and adds
// breathing room on wide viewports without changing anything at mobile
// widths, so it's a drop-in wrapper for each screen's existing markup.
export function PageContainer({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-6 md:px-10", wide ? "max-w-5xl" : "max-w-2xl", className)}>{children}</div>;
}
