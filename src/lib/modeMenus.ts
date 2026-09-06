import type { LucideIcon } from "lucide-react";
import {
  Flame,
  MessageCircle,
  Heart,
  Car,
  Map,
  Store,
  Tag,
  ShoppingCart,
  Bus,
  MapPin,
  Users,
  PhoneCall,
  Clock,
  Share2,
  Camera,
  Lock,
  ShieldCheck,
} from "lucide-react";

/**
 * Ported from the reference demo's `modeMenus` object
 * (reference/tether-app-demo.html, ~line 1460).
 *
 * On the web, each `action` becomes a `navigate(...)` call instead of a
 * `new Function(...)` string — see src/pages/ModeMenu.tsx.
 */
export type ModeKey = "dating" | "ride" | "market" | "student";

export interface ConnectedApp {
  icon: LucideIcon;
  bg: string;
  color: string;
  text?: string;
}

export interface ModeFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Where tapping this feature should take the user. */
  to?: string;
  /** A toast to show instead of/alongside navigating (matches demo's showToast calls). */
  toast?: string;
}

export interface ModeMenuConfig {
  title: string;
  subtitle: string;
  connectedApps?: ConnectedApp[];
  features: ModeFeature[];
}

export const MODE_MENUS: Record<ModeKey, ModeMenuConfig> = {
  dating: {
    title: "Dating Mode",
    subtitle: "Safe dates & meetings",
    connectedApps: [
      { icon: Flame, bg: "bg-pink-500", color: "text-white" },
      { icon: MessageCircle, bg: "bg-yellow-400", color: "text-white" },
      { icon: Heart, bg: "bg-white", color: "text-black", text: "H" },
    ],
    features: [
      { icon: PhoneCall, title: "'Get Out' Protocol", desc: "Trigger a fake emergency call", to: "/consumer/dating" },
      { icon: Clock, title: "Date Timer", desc: "Set a safety check-in", to: "/consumer/active-timer" },
    ],
  },
  ride: {
    title: "Ride Mode",
    subtitle: "Solo travel protection",
    connectedApps: [
      { icon: Car, bg: "bg-black", color: "text-white", text: "Uber" },
      { icon: Car, bg: "bg-pink-600", color: "text-white", text: "Lyft" },
      { icon: Map, bg: "bg-green-500", color: "text-white" },
    ],
    features: [
      { icon: Map, title: "Route Monitor", desc: "Detect off-route deviations", to: "/consumer/ride" },
      { icon: Share2, title: "Share Live Trip", desc: "Send tracking link to contacts", toast: "Trip Link Copied" },
    ],
  },
  market: {
    title: "Marketplace Mode",
    subtitle: "Secure buying & selling",
    connectedApps: [
      { icon: Store, bg: "bg-blue-600", color: "text-white" },
      { icon: Tag, bg: "bg-purple-700", color: "text-white", text: "CL" },
      { icon: ShoppingCart, bg: "bg-green-500", color: "text-white", text: "OU" },
    ],
    features: [
      { icon: Camera, title: "Evidence Locker", desc: "Securely upload photos", to: "/consumer/market" },
      { icon: Lock, title: "View Evidence Vault", desc: "Access encrypted files", to: "/consumer/vault" },
      { icon: ShieldCheck, title: "Vouch Badge", desc: "Show verifying badge to seller", toast: "Verified Badge Displayed" },
    ],
  },
  student: {
    title: "Student Mode",
    subtitle: "Campus & Commute Safety",
    features: [
      { icon: Bus, title: "School Bus Mode", desc: "Track route home", to: "/consumer/student/bus" },
      { icon: MapPin, title: "Walking Home", desc: "Safe passage timer", to: "/consumer/student/walk" },
      { icon: Users, title: "Hanging Out", desc: "Log who you are with", to: "/consumer/student/hangout" },
    ],
  },
};

/** Ported from the reference demo's `premiumFeatures` object (~line 1512). */
export type PremiumKey = "dispatch" | "guardian" | "badge";

export interface PremiumFeatureConfig {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const PREMIUM_FEATURES: Record<PremiumKey, PremiumFeatureConfig> = {
  dispatch: {
    title: "Live 911 Dispatch",
    desc: "Connect directly to 911 dispatch centers via API, bypassing call queues and transmitting your exact GPS and profile.",
    icon: PhoneCall,
    color: "text-red-400",
  },
  guardian: {
    title: "Guardian Dashboard",
    desc: "Allow trusted contacts to view your live status, battery level, and route history in a private dashboard.",
    icon: Users,
    color: "text-emerald-400",
  },
  badge: {
    title: "Vouched ID Badge",
    desc: "Get a verified \"Safe User\" badge to display on dating apps and marketplaces, increasing trust.",
    icon: ShieldCheck,
    color: "text-blue-400",
  },
};
