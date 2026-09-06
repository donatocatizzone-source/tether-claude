/**
 * Central place that reads environment/config values.
 *
 * The Google Maps key is the SAME key used in the original Lovable build
 * (@react-google-maps/api was already a dependency there) — just drop it into
 * .env.local as VITE_GOOGLE_MAPS_API_KEY and every map in the app picks it up.
 *
 * In Google Cloud Console, this key should have these APIs enabled for full
 * Tether functionality:
 *   - Maps JavaScript API      (map rendering — Ride Mode, Student bus map, B2B geofences)
 *   - Places API               (address autocomplete for professional_sessions, showings)
 *   - Geocoding API            (lat/lng <-> address, used by check_ins + user_locations)
 *   - Directions API           (route deviation detection in Ride Mode)
 */

function requireEnv(key: keyof ImportMetaEnv, devFallback = ""): string {
  const value = import.meta.env[key];
  if (!value && import.meta.env.PROD) {
    // Fail loudly in production rather than silently rendering a broken map.
    console.error(`Missing required environment variable: ${key}`);
  }
  return value || devFallback;
}

export const env = {
  googleMapsApiKey: requireEnv("VITE_GOOGLE_MAPS_API_KEY"),
  supabaseUrl: requireEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),

  /**
   * Mixes fabricated team members into the Overwatch console so it isn't
   * empty in a demo. Set VITE_DEMO_SEED=true in .env.local to enable.
   *
   * Off by default, deliberately. One of those seed rows carries an
   * `emergency` status, which the dashboard turns into a critical incident
   * in the live feed. In a safety product a manager cannot be left guessing
   * whether a distress alert is real — an empty console is honest, a console
   * with invented emergencies in it is not.
   */
  demoSeed: import.meta.env.VITE_DEMO_SEED === "true",
};
