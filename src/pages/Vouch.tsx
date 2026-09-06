import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Heart, ShoppingBag, Car } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-vouch (~line 596).
// Ring geometry (r=54, dasharray=339, dashoffset=10) copied literally from
// the reference SVG rather than re-derived, to stay pixel-accurate.
const BADGES = [
  {
    icon: Heart,
    iconClass: "bg-muted text-mode-dating",
    title: "Verified Date",
    desc: "Safety check completed with Sarah",
    points: "+5",
  },
  {
    icon: ShoppingBag,
    iconClass: "bg-muted text-mode-ride",
    title: "Safe Transaction",
    desc: "Marketplace meet with Mike",
    points: "+5",
  },
  {
    icon: Car,
    iconClass: "bg-muted text-mode-ride",
    title: "Verified Trip",
    desc: "Completed route #8821",
    points: "+2",
  },
];

export default function Vouch() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="relative flex h-full flex-col p-6 pt-12">
        <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-background py-2">
          <button
            onClick={() => navigate("/consumer")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Trust Score</h2>
            <p className="text-xs text-muted-foreground">Vouched by Community</p>
          </div>
        </div>

        <div className="mb-8 flex flex-col items-center rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="relative mb-4 flex h-32 w-32 items-center justify-center rounded-full border-[8px] border-border">
            <Star className="absolute h-12 w-12 fill-current text-mode-active" />
            <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="#fde047"
                strokeWidth="8"
                fill="none"
                strokeDasharray="339"
                strokeDashoffset="10"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-4xl font-black text-foreground">
            98<span className="text-lg font-medium text-muted-foreground">/100</span>
          </h3>
          <p className="mt-2 rounded-full bg-background px-3 py-1 text-xs font-bold text-mode-active">
            High Trust Level
          </p>
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Badges</h3>
        <div className="space-y-3 pb-24">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${b.iconClass}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
              <span className="text-xs font-bold text-mode-safe">{b.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
