"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Records a browser's push subscription.
 *
 * Upserted on the endpoint rather than inserted: the browser hands back the
 * same endpoint every time the same device re-subscribes, so an insert would
 * pile up duplicate rows and send the same reminder three times. Re-subscribing
 * also flips is_active back on, which is what "turn notifications back on"
 * means from the user's side.
 */
export async function savePushSubscription(
  sub: PushSubscriptionInput
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { error: "That subscription is missing its keys." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      is_active: true,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

/** Turns this device off without forgetting it, so turning it back on is one tap. */
export async function removePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
