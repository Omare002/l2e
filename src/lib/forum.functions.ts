import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  commentIdSchema,
  discussionInputSchema,
  editReplySchema,
  replyInputSchema,
} from "@/lib/validation";

export const saveDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => discussionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);

    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("discussions")
        .update({ title: data.title, body: data.body, category: data.category })
        .eq("id", data.id)
        .eq("author_id", context.userId)
        .select("*")
        .maybeSingle();
      if (error || !updated) {
        console.error("[saveDiscussion:update]", error?.message);
        throw new Error("Could not save this discussion");
      }
      return updated;
    }

    const { data: created, error } = await context.supabase
      .from("discussions")
      .insert({
        title: data.title,
        body: data.body,
        category: data.category,
        author_id: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[saveDiscussion:insert]", error.message);
      throw new Error("Could not start this discussion");
    }
    return created;
  });

export const deleteDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => commentIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("discussions")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) {
      console.error("[deleteDiscussion]", error.message);
      throw new Error("Could not delete this discussion");
    }
    return { ok: true };
  });

export const addReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => replyInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);

    const { data: created, error } = await context.supabase
      .from("discussion_replies")
      .insert({ discussion_id: data.discussionId, body: data.body, author_id: context.userId })
      .select("*")
      .single();
    if (error) {
      console.error("[addReply]", error.message);
      throw new Error("Could not post your reply");
    }
    return created;
  });

export const editReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editReplySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("discussion_replies")
      .update({ body: data.body })
      .eq("id", data.id)
      .eq("author_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error || !updated) {
      console.error("[editReply]", error?.message);
      throw new Error("Could not save your reply");
    }
    return updated;
  });

export const deleteReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => commentIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("discussion_replies")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) {
      console.error("[deleteReply]", error.message);
      throw new Error("Could not delete this reply");
    }
    return { ok: true };
  });
