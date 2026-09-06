import { useNavigate } from "react-router-dom";
import { X, BatteryCharging, MapPin, Bell } from "lucide-react";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Port of reference/tether-app-demo.html #screen-guardian (~line 1061).
// The original used a fake SVG grid background; this rebuild swaps that
// for a real GoogleMapView per CLAUDE.md's Google Maps section. Gabe's
// pin is kept as a decorative overlay (as in the original) rather than a
// real map marker, since it's a stylized "who you're viewing" indicator.
const GABE_POSITION: LatLng = { lat: 33.081, lng: -97.175 };

export default function Guardian() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-900 text-white">
      <div className="absolute inset-0 z-0 opacity-50">
        <GoogleMapView center={GABE_POSITION} zoom={14} className="h-full w-full" />
      </div>

      <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-slate-900 to-transparent p-6 pb-20 pt-12">
        <div>
          <h2 className="text-2xl font-bold">Mom's View</h2>
          <p className="flex items-center gap-1 text-xs text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live Connection
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-white/10 p-2 backdrop-blur transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute left-1/2 top-1/3 z-10 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-3xl shadow-xl">
          👨🏻
          <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-green-500 p-1">
            <BatteryCharging className="h-3 w-3 text-white" />
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-lg backdrop-blur">
          Gabe • 85% Battery
        </div>
      </div>

      <div className="relative z-10 mt-auto min-h-[300px] rounded-t-[2rem] bg-white p-6 text-slate-900">
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-slate-200" />

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">Status: Active</h3>
            <p className="text-sm text-slate-500">Walking Home • 3 mins ago</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-emerald-600">1.2 mph</div>
            <p className="text-xs text-slate-400">Speed</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase text-slate-400">Destination</div>
              <div className="text-sm font-bold text-slate-900">Home (123 Maple Dr)</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-600">ETA</div>
              <div className="text-sm font-bold text-slate-900">4:15 PM</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-red-700">Emergency Override</div>
              <div className="text-xs text-red-400">Tap to listen to live audio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
