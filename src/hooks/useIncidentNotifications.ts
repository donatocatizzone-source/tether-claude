import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Port of OLD/src/hooks/useIncidentNotifications.ts (see CLAUDE.md > Ground
// truth). Subscribes to new incidents via Realtime and fires browser
// Notifications for critical/high severity events, so managers get
// alerted even on a different tab.
export function useIncidentNotifications() {
  const { user } = useAuth();
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (!("Notification" in window)) return;
    permissionRef.current = Notification.permission;

    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
        if (perm === "granted") {
          toast.success("Push notifications enabled");
        }
      });
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, severity: string) => {
    if (severity === "critical") {
      toast.error(title, { description: body, duration: 10000 });
    } else {
      toast.warning(title, { description: body, duration: 8000 });
    }

    if ("Notification" in window && permissionRef.current === "granted") {
      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: `incident-${Date.now()}`,
          requireInteraction: severity === "critical",
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        if (severity !== "critical") {
          setTimeout(() => notification.close(), 8000);
        }
      } catch {
        // Notification constructor may fail in some contexts
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("incident-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        async (payload) => {
          const incident = payload.new as { severity: string; user_id: string } | undefined;
          if (!incident) return;
          if (!["high", "critical"].includes(incident.severity)) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", incident.user_id)
            .single();

          const name = profile?.full_name || "Team member";
          const isCritical = incident.severity === "critical";

          showNotification(
            isCritical ? "🚨 EMERGENCY — SOS Alert" : "⚠️ Safety Alert",
            isCritical
              ? `${name} has triggered an emergency distress signal. Immediate response required.`
              : `${name} requires attention. A high-severity incident has been reported.`,
            incident.severity,
          );
        },
      )
      .subscribe();

    const sessionChannel = supabase
      .channel("session-duress-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "professional_sessions" },
        async (payload) => {
          const newRow = payload.new as { status: string; user_id: string; client_name: string } | undefined;
          const oldRow = payload.old as { status: string } | undefined;
          if (!newRow || newRow.status !== "duress_alert") return;
          if (oldRow?.status === "duress_alert") return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newRow.user_id)
            .single();

          const name = profile?.full_name || "Team member";

          showNotification(
            "🚨 DURESS ALERT",
            `${name} entered their duress PIN during session "${newRow.client_name}". This may indicate they are under threat.`,
            "critical",
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [user, showNotification]);

  return {
    permissionState: permissionRef.current,
    requestPermission: async () => {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      permissionRef.current = perm;
      return perm;
    },
  };
}
