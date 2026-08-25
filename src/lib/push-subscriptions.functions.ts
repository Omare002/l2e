import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushSubscriptionSchema, removePushSubscriptionSchema } from "@/lib/validation";

/** Stores (or refreshes) the current browser's push subscription for the signed-in user. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pushSubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.error("[savePushSubscription]", error.message);
      throw new Error("Could not save that subscription");
    }
    return { ok: true };
  });

/** Removes a push subscription, e.g. when the user disables notifications. */
export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removePushSubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) {
      console.error("[removePushSubscription]", error.message);
      throw new Error("Could not remove that subscription");
    }
    return { ok: true };
  });
