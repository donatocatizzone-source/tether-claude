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
    <div className="min-h-screen bg-background p-6 pt-12 text-foreground">
      <button onClick={() => navigate("/consumer")} className="mb-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        &larr; Premium
      </button>
      <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-background ${feature.color}`}>
        <feature.icon className="h-8 w-8" />
      </div>
      <h2 className="mb-4 text-3xl font-bold">{feature.title}</h2>
      <p className="mb-8 leading-relaxed text-muted-foreground">{feature.desc}</p>
      <button className="w-full rounded-xl bg-card py-4 font-bold text-foreground shadow-lg transition hover:bg-muted">
        Unlock Feature ($9.99/mo)
      </button>
    </div>
  );
}
