import { AlertTriangle, CheckCircle, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Incident } from "@/components/overwatch/dummyData";

// Port of OLD/src/components/tether/overwatch/IncidentFeed.tsx (see
// CLAUDE.md > Ground truth).
const typeConfig = {
  emergency: { Icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  checkin: { Icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
  alert: { Icon: Bell, color: "text-amber-400", bg: "bg-amber-500/10" },
};

export function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  return (
    <Card className="border-border bg-secondary">
      <CardContent className="p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Incident Feed</h3>
        <div className="space-y-2">
          {incidents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No incidents recorded</p>
          ) : (
            incidents.map((inc) => {
              const cfg = typeConfig[inc.type];
              return (
                <div key={inc.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-background/50">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bg}`}>
                    <cfg.Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{inc.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{inc.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{inc.time}</span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IncidentFeed;
