import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ProfileRow } from "@/lib/db";

export type ConversationRow = Tables<"conversations">;
export type MessageRow = Tables<"messages">;
export type NotificationRow = Tables<"notifications">;

export type PartnerLite = Pick<
  ProfileRow,
  "id" | "username" | "display_name" | "avatar_url" | "accent_color"
>;

export type Conversation = ConversationRow & {
  a: PartnerLite | null;
  b: PartnerLite | null;
  project: Pick<Tables<"projects">, "slug" | "title"> | null;
};

export type ConversationView = Conversation & {
  partner: PartnerLite | null;
  unread: number;
  isRequester: boolean;
  needsMyAnswer: boolean;
  myReadAt: string | null;
  theirReadAt: string | null;
};

export type NotificationItem = NotificationRow & { actor: PartnerLite | null };

const PARTNER = "id, username, display_name, avatar_url, accent_color";

export const mqk = {
  conversations: (userId: string) => ["conversations", userId] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  blocks: (userId: string) => ["blocks", userId] as const,
};

export function conversationsQuery(userId: string | null) {
  return queryOptions({
    queryKey: mqk.conversations(userId ?? "none"),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `*, a:profiles!conversations_user_a_fkey(${PARTNER}), b:profiles!conversations_user_b_fkey(${PARTNER}), project:projects!conversations_project_id_fkey(slug, title)`,
        )
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error("[messaging] conversations:", error.message);
        throw new Error("Could not load your conversations");
      }
      return (data ?? []) as unknown as Conversation[];
    },
  });
}

export function messagesQuery(conversationId: string | undefined) {
  return queryOptions({
    queryKey: mqk.messages(conversationId ?? "none"),
    enabled: Boolean(conversationId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) {
        console.error("[messaging] messages:", error.message);
        throw new Error("Could not load this conversation");
      }
      return data ?? [];
    },
  });
}

export function notificationsQuery(userId: string | null) {
  return queryOptions({
    queryKey: mqk.notifications(userId ?? "none"),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`*, actor:profiles!notifications_actor_id_fkey(${PARTNER})`)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) {
        console.error("[messaging] notifications:", error.message);
        return [];
      }
      return (data ?? []) as unknown as NotificationItem[];
    },
  });
}

export function blocksQuery(userId: string | null) {
  return queryOptions({
    queryKey: mqk.blocks(userId ?? "none"),
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId!);
      return (data ?? []).map((r) => r.blocked_id);
    },
  });
}

/** Adds the viewer's perspective: who the other person is, unread count, request state. */
export function decorate(
  conversations: Conversation[],
  userId: string | null,
  unreadByConversation: Record<string, number>,
): ConversationView[] {
  if (!userId) return [];
  return conversations.map((c) => {
    const isA = c.user_a === userId;
    return {
      ...c,
      partner: isA ? c.b : c.a,
      myReadAt: isA ? c.read_a_at : c.read_b_at,
      theirReadAt: isA ? c.read_b_at : c.read_a_at,
      unread: unreadByConversation[c.id] ?? 0,
      isRequester: c.requester_id === userId,
      needsMyAnswer: c.status === "pending" && c.requester_id !== userId,
    };
  });
}
