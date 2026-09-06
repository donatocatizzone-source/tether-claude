import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, BellOff } from "lucide-react";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Port of reference/tether-app-demo.html #screen-b2b-openhouse (~line 545).
// The original used a static listing photo + radar-ping overlay; this
// rebuild swaps the backdrop for a real GoogleMapView per CLAUDE.md's
// Google Maps section, keeping the radar ping as a decorative "you are
// here" overlay (as in the original, not tied to a real marker).
const LISTING_POSITION: LatLng = { lat: 33.081, lng: -97.175 };

export default function B2BOpenHouse() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-900 p-6 pt-12 text-white">
      <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-slate-900 py-2">
        <button
          onClick={() => navigate("/b2b")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 shadow-sm transition hover:bg-slate-700"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Open House</h2>
          <p className="text-xs text-yellow-500">Active Monitoring</p>
        </div>
      </div>

      <div className="relative mb-6 h-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
        <GoogleMapView center={LISTING_POSITION} zoom={16} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-indigo-900/40" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <span className="relative flex h-24 w-24">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-20" />
            <span className="relative inline-flex h-24 w-24 rounded-full border-2 border-yellow-500 opacity-50" />
          </span>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 border-white bg-yellow-500 shadow-lg" />

        <div className="font-mono-data absolute bottom-4 left-4 rounded bg-black/60 px-3 py-1 text-xs backdrop-blur">
          Geofence: 100ft
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div>
            <h4 className="text-sm font-bold">Auto-Check In</h4>
            <p className="text-[10px] text-slate-500">Vibrate phone every 15m</p>
          </div>
          <div className="relative h-6 w-10 rounded-full bg-yellow-500">
            <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow" />
          </div>
        </div>

        <button
          onClick={() => toast.error("Silent Alarm Triggered - Team Notified")}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-red-500/50 bg-red-900/50 py-6 font-bold text-red-400 transition hover:bg-red-900"
        >
          <BellOff className="mb-1 h-6 w-6" />
          SILENT ALARM
        </button>
        <p className="text-center text-[10px] text-slate-500">
          Alerts broker &amp; team immediately. No local sound.
        </p>
      </div>
    </div>
  );
}
