import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Employee } from "@/components/overwatch/dummyData";
import { GoogleMapView } from "@/components/maps/GoogleMapView";

// Port of OLD/src/components/tether/overwatch/AlertsMap.tsx (see CLAUDE.md
// > Ground truth). Privacy rule preserved exactly: only plot a pin for a
// user whose status is Active or Distress — idle users never get a pin.
export function AlertsMap({ employees }: { employees: Employee[] }) {
  const visiblePins = employees.filter((e) => e.status !== "idle");

  const markers = visiblePins
    .filter((e) => e.location)
    .map((e) => ({
      position: { lat: e.location!.lat, lng: e.location!.lng },
      color: (e.status === "emergency" ? "red" : "amber") as "red" | "amber",
    }));

  const center = markers.length > 0 ? markers[0].position : { lat: 30.2672, lng: -97.7431 };

  return (
    <Card className="border-border bg-secondary">
      <CardContent className="p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Alerts Map</h3>
        <div className="relative h-64 w-full overflow-hidden rounded-xl">
          <GoogleMapView center={center} zoom={12} markers={markers} className="h-full w-full" />
          {visiblePins.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">No active alerts</p>
            </div>
          )}
          {visiblePins.length > 0 && (
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
              {visiblePins.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 backdrop-blur-sm">
                  {emp.status === "emergency" ? (
                    <AlertTriangle size={12} className="text-red-500" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                  <span className="text-[11px] font-medium text-foreground">{emp.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Privacy: Only active/distress employees are shown. Idle locations are hidden.
        </p>
      </CardContent>
    </Card>
  );
}

export default AlertsMap;
