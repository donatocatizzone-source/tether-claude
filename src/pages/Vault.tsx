import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, FileText } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-vault (~line 881). Static
// grid, no onclick handlers in the reference — thumbnails are decorative.
export default function Vault() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="relative flex h-full flex-col p-6 pt-12">
        <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-slate-900 py-2">
          <button
            onClick={() => navigate("/consumer")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 shadow-sm transition hover:bg-slate-700"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Evidence Vault</h2>
            <p className="text-xs text-slate-400">Encrypted &amp; Locked</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transition group-hover:opacity-50"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80')",
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <Lock className="mb-2 h-6 w-6 text-emerald-400" />
              <span className="font-mono-data text-[10px] text-slate-300">IMG_2921.enc</span>
            </div>
          </div>

          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <div className="absolute inset-0 bg-slate-700 opacity-50 transition group-hover:opacity-60" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <FileText className="mb-2 h-6 w-6 text-blue-400" />
              <span className="font-mono-data text-[10px] text-slate-300">LOG_8821.txt</span>
            </div>
          </div>

          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transition group-hover:opacity-50"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80')",
              }}
            />
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              <Lock className="mb-2 h-6 w-6 text-emerald-400" />
              <span className="font-mono-data text-[10px] text-slate-300">IMG_2922.enc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
