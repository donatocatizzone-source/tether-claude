import { useState } from "react";
import { ShieldAlert, Building2 } from "lucide-react";
import { OverwatchAnalytics } from "@/components/overwatch/OverwatchAnalytics";
import { BrokerageAnalytics } from "@/components/overwatch/BrokerageAnalytics";
import { cn } from "@/lib/utils";

// Hosts both analytics sets behind one nav item. Kept as a segmented toggle
// rather than a third sidebar entry — "Analytics" is one destination, and the
// sidebar is already ten items deep.
//
// Safety and brokerage metrics are genuinely separate questions ("is everyone
// alright?" vs "is the team busy?"), so they are not merged into one page.

type Tab = "safety" | "brokerage";

const TABS: { id: Tab; label: string; Icon: typeof ShieldAlert }[] = [
  { id: "safety", label: "Safety", Icon: ShieldAlert },
  { id: "brokerage", label: "Brokerage", Icon: Building2 },
];

export function AnalyticsView() {
  const [tab, setTab] = useState<Tab>("safety");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "safety" ? "Incidents and response times" : "Showing volume, coverage, and agent activity"}
          </p>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-border">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                tab === id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "safety" ? <OverwatchAnalytics /> : <BrokerageAnalytics />}
    </div>
  );
}

export default AnalyticsView;
