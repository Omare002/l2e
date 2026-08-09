import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Presence + typing for one conversation. Each side joins a channel keyed by the
 * conversation id, so online status and "typing…" are live but never persisted.
 */
export function useChatPresence(conversationId: string | undefined, userId: string | null) {
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Only participants may join a conversation's presence channel. RLS on
    // `conversations` decides this, so an outsider guessing an id gets nothing.
    void (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      if (cancelled || error || !data) return;

      const joined = supabase.channel(`chat:${conversationId}`, {
        config: { presence: { key: userId }, private: true },
      });
      channel = joined;
      channelRef.current = joined;

      const syncPresence = () => {
        const state = joined.presenceState();
        setPartnerOnline(Object.keys(state).some((key) => key !== userId));
      };

      joined
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.userId === userId) return;
          setPartnerTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setPartnerTyping(false), 2600);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void joined.track({ at: Date.now() });
        });
    })();

    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      channelRef.current = null;
      setPartnerOnline(false);
      setPartnerTyping(false);
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 1400) return;
    lastSent.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  }, [userId]);

  return { partnerOnline, partnerTyping, notifyTyping };
}
