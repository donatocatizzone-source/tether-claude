import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Lock } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-market +
// captureEvidence() (~line 1227 / ~1652).
export default function MarketplaceMode() {
  const navigate = useNavigate();
  const [captured, setCaptured] = useState(false);

  const capture = () => {
    toast.info("Encrypting...");
    setTimeout(() => {
      setCaptured(true);
      toast.success("Upload Complete");
    }, 1000);
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "33% 33%",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-6 pt-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/consumer")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 backdrop-blur">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-bold">SECURE VAULT</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex flex-col items-center gap-6 pb-12">
          <div className="rounded-lg bg-black/40 px-4 py-2 backdrop-blur">
            <p className="text-center text-xs font-medium">Align License Plate or Face</p>
          </div>
          <button
            onClick={capture}
            className="flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white shadow-2xl"
          >
            <div className="h-16 w-16 rounded-full bg-white transition duration-150 active:scale-90" />
          </button>
        </div>
      </div>

      {captured && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600 p-8 text-center">
          <div className="mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white shadow-xl">
            <Lock className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold">Evidence Secured</h2>
          <p className="mb-10 mt-2 text-base text-white/90">Image encrypted and uploaded to cloud vault.</p>
          <button
            onClick={() => navigate("/consumer")}
            className="rounded-2xl bg-white px-10 py-4 font-bold text-emerald-800 shadow-lg transition active:scale-95"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
