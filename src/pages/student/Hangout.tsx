import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Port of reference/tether-app-demo.html #screen-student-hangout (~line 736)
// + toggleFriend() (~line 1829). The "Location Map Section" here is the
// original's own fake grid + pin overlay (not one of the screens CLAUDE.md
// calls out for the GoogleMapView swap), so it's kept as-is.
const FRIENDS = [
  { name: "Paolo", emoji: "👴", bg: "bg-indigo-100" },
  { name: "Alberto", emoji: "👨", bg: "bg-blue-100" },
  { name: "Justin", emoji: "🦍", bg: "bg-pink-100" },
];

export default function StudentHangout() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleFriend(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-indigo-50 p-6 pt-12">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate("/consumer")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-indigo-900" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-indigo-900">Who are you with?</h2>
          <p className="text-xs text-indigo-700">Create a Safety Bubble</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {FRIENDS.map((f) => {
          const isSelected = selected.has(f.name);
          return (
            <button
              key={f.name}
              onClick={() => toggleFriend(f.name)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 shadow-sm transition",
                isSelected ? "border-indigo-500 bg-indigo-50" : "border-transparent bg-white hover:border-indigo-300",
              )}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${f.bg}`}>
                {f.emoji}
              </div>
              <span className="text-xs font-bold text-slate-700">{f.name}</span>
            </button>
          );
        })}
        <button className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white/50 text-indigo-400">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="relative mb-6 h-64 w-full flex-shrink-0 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm">
        <svg width="100%" height="100%" className="absolute inset-0 opacity-60">
          <pattern id="grid-hangout" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-hangout)" />
        </svg>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center">
          <div className="mb-1 animate-bounce rounded-full bg-white p-1 shadow-md">
            <MapPin className="h-6 w-6 fill-current text-indigo-600" />
          </div>
          <div className="rounded border border-indigo-100 bg-white/90 px-2 py-1 text-[10px] font-bold text-indigo-900 shadow-sm">
            📍 Starbucks (300ft)
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <h4 className="mb-2 text-sm font-bold text-indigo-900">Guardian Notification</h4>
        <p className="mb-4 text-xs text-slate-500">
          "Checking in at <span className="font-bold">Starbucks</span> with..."
        </p>
        <div className="flex min-h-[24px] gap-2">
          {FRIENDS.filter((f) => selected.has(f.name)).map((f) => (
            <span
              key={f.name}
              className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700"
            >
              {f.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto pb-24 pt-6">
        <button
          onClick={() => {
            toast.success("Safety Bubble Created");
            navigate("/consumer");
          }}
          className="w-full rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-xl transition hover:bg-indigo-700"
        >
          Check In
        </button>
      </div>
    </div>
  );
}
