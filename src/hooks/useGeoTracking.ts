import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Port of OLD/src/hooks/useGeoTracking.ts (see CLAUDE.md > Ground truth).
const UPSERT_INTERVAL_MS = 30_000;

interface UseGeoTrackingOptions {
  userId: string | undefined;
  /** When true, GPS tracking is active and upserting to user_locations */
  enabled: boolean;
}

export interface GeoTrackingState {
  location: { lat: number; lng: number } | null;
  isTracking: boolean;
  error: string | null;
}

/**
 * Watches device GPS while `enabled` is true.
 * – Sets `currentLocation` on every position update (live map pin).
 * – Upserts to `user_locations` every 30 s (Overwatch hub sync).
 * – Cleans up watch + interval on disable or unmount.
 */
export function useGeoTracking({ userId, enabled }: UseGeoTrackingOptions): GeoTrackingState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const upsert = useCallback(
    async (lat: number, lng: number) => {
      if (!userId) return;
      setLocation({ lat, lng });
      await supabase
        .from("user_locations")
        .upsert({ user_id: userId, lat, lng, last_updated: new Date().toISOString() }, { onConflict: "user_id" });
    },
    [userId],
  );

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = "Geolocation not supported on this device";
      setError(msg);
      toast.error(msg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setError(null);
        upsert(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(err.message);
        toast.error("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true },
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => upsert(pos.coords.latitude, pos.coords.longitude),
        () => {},
      );
    }, UPSERT_INTERVAL_MS);

    setIsTracking(true);
  }, [upsert]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (enabled && userId) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, userId, start, stop]);

  return { location, isTracking, error };
}
