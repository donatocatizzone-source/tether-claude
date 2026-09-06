import { useParams, useNavigate } from "react-router-dom";
import { PREMIUM_FEATURES, type PremiumKey } from "@/lib/modeMenus";

// Port target: reference/tether-app-demo.html #screen-premium + openPremium()
// (~line 1015 / ~1570). Data-driven the same way ModeMenu.tsx is.
export default function Premium() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const feature = PREMIUM_FEATURES[key as PremiumKey];

  if (!feature) {
    return (
      <div className="p-6 text-muted-foreground">
        Unknown premium feature "{key}".
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 pt-12 text-white">
      <button onClick={() => navigate("/")} className="mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">
        &larr; Premium
      </button>
      <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 ${feature.color}`}>
        <feature.icon className="h-8 w-8" />
      </div>
      <h2 className="mb-4 text-3xl font-bold">{feature.title}</h2>
      <p className="mb-8 leading-relaxed text-slate-400">{feature.desc}</p>
      <button className="w-full rounded-xl bg-white py-4 font-bold text-slate-900 shadow-lg transition hover:bg-slate-200">
        Unlock Feature ($9.99/mo)
      </button>
    </div>
  );
}
