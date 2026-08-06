import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * A client that bypasses RLS, for the one caller that has no user session:
 * the cron route that sends due-bill reminders.
 *
 * This must never be imported into anything a browser can reach. It is also
 * why `due_reminders()` returns `user_id` on every row -- without a session
 * there is no `auth.uid()` to scope by, so the caller has to group by it
 * explicitly. A view that relies on RLS to scope itself returns everyone's
 * data through this client, which is precisely the trap v1 hit when it wired
 * its email digest to `account_balance`.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
