import { useMemo } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { env } from "@/lib/env";

// Keep this array identity stable across renders/HMR — @react-google-maps/api
// warns loudly (and can double-load the script) if `libraries` is a new array
// every render.
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

// Dark map style so the map matches the app's Slate 900 theme instead of
// dropping in a bright white Google default.
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1424" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker {
  position: LatLng;
  /** Short marker label, e.g. a contact's initial. */
  label?: string;
}

interface GoogleMapViewProps {
  center: LatLng;
  zoom?: number;
  /** Current live position, e.g. the rider or the person being tracked. */
  marker?: LatLng;
  /** Multiple labeled pins, e.g. Safety Circle members. */
  markers?: MapMarker[];
  /** Expected route, used to detect deviation in Ride Mode. */
  expectedPath?: LatLng[];
  /** Actual traveled path so far. */
  actualPath?: LatLng[];
  className?: string;
}

/**
 * Shared map surface for every screen that needs live location:
 * Ride Mode deviation tracking, Student Mode bus/walk tracking, the B2B
 * Overwatch dashboard, and geofence editing.
 *
 * Uses the SAME Google Maps API key as the original Lovable build
 * (VITE_GOOGLE_MAPS_API_KEY) — see src/lib/env.ts for which Cloud APIs
 * need to be enabled on that key.
 */
export function GoogleMapView({
  center,
  zoom = 15,
  marker,
  markers,
  expectedPath,
  actualPath,
  className = "h-full w-full",
}: GoogleMapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "tether-google-maps-script",
    googleMapsApiKey: env.googleMapsApiKey,
    libraries: LIBRARIES,
  });

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      styles: DARK_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    }),
    [],
  );

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-card text-sm text-destructive`}>
        Couldn't load Google Maps. Check VITE_GOOGLE_MAPS_API_KEY in .env.local.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-card text-sm text-muted-foreground`}>
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap mapContainerClassName={className} center={center} zoom={zoom} options={options}>
      {expectedPath && (
        <PolylineF
          path={expectedPath}
          options={{ strokeColor: "#2dd4bf", strokeOpacity: 0.6, strokeWeight: 4 }}
        />
      )}
      {actualPath && (
        <PolylineF
          path={actualPath}
          options={{ strokeColor: "#f59e0b", strokeOpacity: 0.9, strokeWeight: 4 }}
        />
      )}
      {marker && <MarkerF position={marker} />}
      {markers?.map((m, i) => (
        <MarkerF
          key={i}
          position={m.position}
          label={m.label ? { text: m.label, color: "#fff", fontWeight: "bold" } : undefined}
        />
      ))}
    </GoogleMap>
  );
}
