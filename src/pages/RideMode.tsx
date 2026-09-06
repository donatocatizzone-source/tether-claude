import { useState } from "react";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Placeholder ride, standing in for real Directions API + geolocation data.
// See CLAUDE.md > Consumer Features > Ride Mode for the full deviation-detection spec.
const PICKUP: LatLng = { lat: 33.075, lng: -97.19 };
const DROPOFF: LatLng = { lat: 33.09, lng: -97.15 };
const EXPECTED_PATH: LatLng[] = [PICKUP, { lat: 33.083, lng: -97.17 }, DROPOFF];

export default function RideMode() {
  const [current] = useState<LatLng>({ lat: 33.081, lng: -97.175 });
  const [deviated] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-mode-ride">Ride Mode</p>
        <h1 className="text-xl font-semibold">Trip in progress</h1>
        <p className="text-sm text-muted-foreground">
          {deviated ? "Route deviation detected — check in below" : "On the expected route"}
        </p>
      </header>

      <div className="relative flex-1">
        <GoogleMapView
          center={current}
          marker={current}
          expectedPath={EXPECTED_PATH}
          actualPath={[PICKUP, current]}
        />

        <div className="glass-panel absolute bottom-4 left-4 right-4 rounded-2xl p-4">
          <p className="text-sm font-medium">Share this trip with your Safety Circle</p>
          <p className="text-xs text-muted-foreground">
            Trusted contacts get a live link if the driver deviates from the expected route
            (see `active_sessions` in the schema).
          </p>
        </div>
      </div>
    </div>
  );
}
