import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Bus as BusIcon } from "lucide-react";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Port of reference/tether-app-demo.html #screen-student-bus (~line 661)
// + runBusSim()/runBusDeviation()/resetBusSim() (~line 1712). The original
// animated a CSS-positioned bus icon over a fake SVG path; this rebuild
// drives a real GoogleMapView marker through the same waypoint timing
// (3s / 3s / 2s stages) instead.
const START: LatLng = { lat: 33.07, lng: -97.19 };
const MID: LatLng = { lat: 33.08, lng: -97.175 };
const END: LatLng = { lat: 33.095, lng: -97.16 };
const DEVIATION: LatLng = { lat: 33.08, lng: -97.155 };

function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

export default function StudentBus() {
  const navigate = useNavigate();
  const [busPos, setBusPos] = useState<LatLng>(START);
  const [status, setStatus] = useState("Heading Home • Stopped");
  const [isDeviated, setIsDeviated] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  function animateTo(from: LatLng, to: LatLng, durationMs: number, onDone: () => void) {
    const startTime = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      setBusPos(lerp(from, to, t));
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        onDone();
      }
    }
    animRef.current = requestAnimationFrame(step);
  }

  function resetBusSim() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setBusPos(START);
    setIsDeviated(false);
  }

  function runBusSim() {
    resetBusSim();
    setStatus("Heading Home • En Route");
    animateTo(START, MID, 3000, () => {
      animateTo(MID, END, 3000, () => {
        setStatus("Approaching Stop");
        toast.success("Bus Route Monitored");
      });
    });
  }

  function runBusDeviation() {
    resetBusSim();
    setStatus("Heading Home • En Route");
    animateTo(START, MID, 3000, () => {
      animateTo(MID, DEVIATION, 2000, () => {
        setStatus("OFF ROUTE");
        setIsDeviated(true);
        toast.error("BUS OFF ROUTE ALERT!");
      });
    });
  }

  return (
    <div className="relative min-h-screen bg-yellow-50">
      <div className="absolute inset-0 z-0">
        <GoogleMapView center={MID} zoom={13} marker={busPos} className="h-full w-full" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="p-6 pt-12">
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg"
          >
            <ArrowLeft className="h-5 w-5 text-yellow-700" />
          </button>
          <div className="flex items-center gap-4 rounded-2xl border border-yellow-200 bg-white p-5 shadow-xl">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full font-bold ${
                isDeviated ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
              }`}
            >
              <BusIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">Route 44 School Bus</h3>
              <p className={`text-xs ${isDeviated ? "text-red-600 font-bold" : "text-slate-500"}`}>{status}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-4 p-6 pb-24">
          <button
            onClick={runBusSim}
            className="w-full rounded-xl bg-yellow-500 py-4 text-xs font-bold text-white shadow-lg transition hover:bg-yellow-600"
          >
            Simulate Route
          </button>
          <button
            onClick={runBusDeviation}
            className="w-full rounded-xl bg-red-500 py-4 text-xs font-bold text-white shadow-lg transition hover:bg-red-600"
          >
            Simulate Deviation
          </button>
        </div>
      </div>
    </div>
  );
}
