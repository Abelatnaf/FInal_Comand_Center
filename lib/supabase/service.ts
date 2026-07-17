import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role client for background jobs that need to read across every
// user (notification cron routes) — the only place in this app that
// intentionally bypasses RLS, since a cron invocation has no user session
// to scope queries by. Never import this into anything reachable from a
// browser request; it belongs to app/api/cron/** only.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Settings → Environment Variables (copy the service_role key from the Supabase dashboard → Settings → API) before the notification cron routes can run."
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
