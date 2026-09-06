import { useState } from "react";
import { Briefcase, MapPin, Clock, Shield, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

// Port of OLD/src/components/tether/pro/ProGuardSetup.tsx (see CLAUDE.md >
// Ground truth).
export interface ProSessionSetup {
  clientName: string;
  address: string;
  notes: string;
  durationMin: number;
  geofenceEnabled: boolean;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadiusM: number;
}

interface Props {
  onStart: (data: ProSessionSetup) => void;
}

const durations = [
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
];

export function ProGuardSetup({ onStart }: Props) {
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMin, setDurationMin] = useState(30);

  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceLat, setGeofenceLat] = useState<number | null>(null);
  const [geofenceLng, setGeofenceLng] = useState<number | null>(null);
  const [geofenceRadiusM, setGeofenceRadiusM] = useState(200);
  const [locating, setLocating] = useState(false);

  const canStart = clientName.trim().length > 0;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeofenceLat(pos.coords.latitude);
        setGeofenceLng(pos.coords.longitude);
        setLocating(false);
        toast.success("Location set as geofence center");
      },
      () => {
        setLocating(false);
        toast.error("Could not get location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24">
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20">
          <Briefcase size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pro Guard</h1>
          <p className="text-xs text-muted-foreground">Start a professional safety session</p>
        </div>
      </div>

      <Card className="mt-6 border-border bg-secondary">
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Client Name *</label>
            <Input
              placeholder="e.g. John Smith"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <MapPin size={12} className="mr-1 inline" />
              Location
            </label>
            <Input
              placeholder="456 Hollywood Blvd"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea
              placeholder="Optional appointment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock size={12} />
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDurationMin(d.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                    durationMin === d.value
                      ? "border-sky-500 bg-sky-500/20 text-sky-400"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border-border bg-secondary">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-foreground">Geofence Alert</p>
                <p className="text-xs text-muted-foreground">Alert if you leave the area</p>
              </div>
            </div>
            <Switch checked={geofenceEnabled} onCheckedChange={setGeofenceEnabled} />
          </div>

          {geofenceEnabled && (
            <div className="space-y-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="w-full gap-2"
              >
                <Locate size={14} />
                {locating ? "Getting location..." : geofenceLat ? "Location Set ✓" : "Use Current Location"}
              </Button>

              {geofenceLat && geofenceLng && (
                <p className="text-center text-xs text-muted-foreground">
                  {geofenceLat.toFixed(5)}, {geofenceLng.toFixed(5)}
                </p>
              )}

              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Safe Zone Radius</span>
                  <span className="font-semibold text-foreground">{geofenceRadiusM}m</span>
                </label>
                <Slider
                  value={[geofenceRadiusM]}
                  onValueChange={([v]) => setGeofenceRadiusM(v)}
                  min={50}
                  max={1000}
                  step={50}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>50m</span>
                  <span>1km</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={() =>
          onStart({
            clientName,
            address,
            notes,
            durationMin,
            geofenceEnabled,
            geofenceLat: geofenceEnabled ? geofenceLat : null,
            geofenceLng: geofenceEnabled ? geofenceLng : null,
            geofenceRadiusM,
          })
        }
        disabled={!canStart || (geofenceEnabled && !geofenceLat)}
        className="mt-6 h-14 w-full rounded-2xl bg-sky-500 text-base font-bold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 disabled:opacity-40"
      >
        <Briefcase size={20} className="mr-2" />
        Start Guard
      </Button>
    </div>
  );
}

export default ProGuardSetup;
