import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  blockUserSchema,
  reportConversationSchema,
  respondRequestSchema,
  sendMessageSchema,
  startConversationSchema,
} from "@/lib/validation";

/** Conversations store the two members in a stable order so pairs stay unique. */
function pair(one: string, two: string) {
  return one < two ? { user_a: one, user_b: two } : { user_a: two, user_b: one };
}

/** Opens the existing thread between two members, or creates a pending request. */
export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startConversationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    if (data.recipientId === me) throw new Error("You can't message yourself");

    const { user_a, user_b } = pair(me, data.recipientId);

    const blocked = await context.supabase
      .from("blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${user_a},blocked_id.eq.${user_b}),and(blocker_id.eq.${user_b},blocked_id.eq.${user_a})`,
      )
      .maybeSingle();
    if (blocked.data) throw new Error("This conversation isn't available");

    const existing = await context.supabase
      .from("conversations")
      .select("*")
      .eq("user_a", user_a)
      .eq("user_b", user_b)
      .maybeSingle();

    if (existing.data) {
      // Reopen a declined thread only for the person who was declined-free side.
      if (existing.data.status === "declined" && existing.data.requester_id === me) {
        throw new Error("This request was declined");
      }
      if (data.projectId && !existing.data.project_id) {
        await context.supabase
          .from("conversations")
          .update({ project_id: data.projectId })
          .eq("id", existing.data.id);
      }
      return { id: existing.data.id, created: false };
    }

    const { data: created, error } = await context.supabase
      .from("conversations")
      .insert({
        user_a,
        user_b,
        requester_id: me,
        status: "pending",
        project_id: data.projectId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[startConversation]", error.message);
      throw new Error("Could not start this conversation");
    }
    return { id: created.id, created: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendMessageSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.imagePath && !data.imagePath.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid attachment");
    }

    const { data: message, error } = await context.supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: context.userId,
        body: data.body,
        image_path: data.imagePath ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[sendMessage]", error.message);
      throw new Error("Could not send that message");
    }
    return message;
  });

export const respondToRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => respondRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const conv = await context.supabase
      .from("conversations")
      .select("*")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv.data) throw new Error("Conversation not found");
    if (conv.data.requester_id === context.userId) {
      throw new Error("Only the recipient can answer this request");
    }

    if (data.action === "block") {
      await context.supabase
        .from("blocks")
        .insert({ blocker_id: context.userId, blocked_id: conv.data.requester_id });
    }

    const { error } = await context.supabase
      .from("conversations")
      .update({ status: data.action === "accept" ? "accepted" : "declined" })
      .eq("id", data.conversationId);
    if (error) {
      console.error("[respondToRequest]", error.message);
      throw new Error("Could not update that request");
    }
    return { ok: true };
  });

export const setBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blockUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("That isn't possible");

    if (data.action === "block") {
      const { error } = await context.supabase
        .from("blocks")
        .insert({ blocker_id: context.userId, blocked_id: data.userId });
      if (error && !error.message.includes("duplicate")) {
        console.error("[setBlocked]", error.message);
        throw new Error("Could not block that member");
      }
    } else {
      const { error } = await context.supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", context.userId)
        .eq("blocked_id", data.userId);
      if (error) {
        console.error("[setBlocked]", error.message);
        throw new Error("Could not unblock that member");
      }
    }
    return { ok: true };
  });

export const reportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportConversationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversation_reports").insert({
      reporter_id: context.userId,
      conversation_id: data.conversationId,
      reason: data.reason,
    });
    if (error) {
      console.error("[reportConversation]", error.message);
      throw new Error("Could not send that report");
    }
    return { ok: true };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ conversationId: String((input as any).conversationId) }))
  .handler(async ({ data, context }) => {
    const conv = await context.supabase
      .from("conversations")
      .select("id, user_a, user_b")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv.data) return { ok: false };

    const column = conv.data.user_a === context.userId ? "read_a_at" : "read_b_at";
    await context.supabase
      .from("conversations")
      .update({ [column]: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    id: (input as { id?: string | null } | null)?.id ?? null,
  }))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) {
      console.error("[markNotificationsRead]", error.message);
      throw new Error("Could not update notifications");
    }
    return { ok: true };
  });
