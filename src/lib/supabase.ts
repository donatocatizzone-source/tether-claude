import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// createClient() throws synchronously on an empty supabaseUrl, which would
// crash the whole app at import time before a live project is configured
// (see CLAUDE.md > Suggested build order, step 1). Fall back to a
// placeholder that constructs fine; real auth/queries will simply fail at
// call time with a network error until .env.local has real values.
const hasRealCredentials = Boolean(env.supabaseUrl && env.supabaseAnonKey);

if (!hasRealCredentials) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — " +
      "auth and data calls will fail until a live Supabase project is configured.",
  );
}

export const supabase = createClient<Database>(
  hasRealCredentials ? env.supabaseUrl : "https://placeholder.supabase.co",
  hasRealCredentials ? env.supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
