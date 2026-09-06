import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Extracted verbatim from OverwatchAnalytics, where it was declared without
// `export` — which meant a second analytics screen either duplicated it or
// couldn't use it. Typed against LucideIcon here rather than the original's
// `typeof AlertTriangle`, which only worked because that icon happened to be
// imported in that file.
export function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="border-border bg-secondary">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default KpiCard;
