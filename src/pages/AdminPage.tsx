import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { OverwatchDashboard } from "@/components/overwatch/OverwatchDashboard";
import { TopBar } from "@/components/layout/TopBar";
import { useIncidentNotifications } from "@/hooks/useIncidentNotifications";
import { Button } from "@/components/ui/button";

// Mounted at /business/admin by App.tsx (see CLAUDE.md > Architecture).
// Real Overwatch manager console now — replaces the earlier ScreenStub,
// which itself replaced the never-built, orphaned src/pages/b2b/Dashboard.tsx
// stub from before OLD was discovered (see CLAUDE.md > Ground truth).
export default function AdminPage() {
  const { requestPermission } = useIncidentNotifications();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    await requestPermission();
    setShowBanner(false);
  };

  return (
    <>
      <TopBar />

      {showBanner && (
        <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 md:mx-6">
          <Bell size={18} className="shrink-0 text-amber-400" />
          <p className="flex-1 text-sm text-foreground">
            <strong>Enable push notifications</strong> to get alerted on SOS and duress events even when you're on another tab.
          </p>
          <Button size="sm" onClick={handleEnable} className="shrink-0">
            Enable
          </Button>
          <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      )}

      <OverwatchDashboard />
    </>
  );
}
