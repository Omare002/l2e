-- ============ conversations ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  read_a_at timestamptz,
  read_b_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT conversations_distinct_check CHECK (user_a <> user_b),
  CONSTRAINT conversations_ordered_check CHECK (user_a < user_b)
);
CREATE UNIQUE INDEX conversations_pair_key ON public.conversations (user_a, user_b);
CREATE INDEX conversations_user_a_idx ON public.conversations (user_a, last_message_at DESC);
CREATE INDEX conversations_user_b_idx ON public.conversations (user_b, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============ blocks ============
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_distinct_check CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see blocks involving them" ON public.blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
CREATE POLICY "Users can block others" ON public.blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users can unblock" ON public.blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- helper: is there a block in either direction
CREATE OR REPLACE FUNCTION public.is_blocked_pair(_one uuid, _two uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _one AND blocked_id = _two)
       OR (blocker_id = _two AND blocked_id = _one)
  );
$$;

CREATE POLICY "Participants can view their conversations" ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Requester can start a conversation" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    requester_id = auth.uid()
    AND auth.uid() IN (user_a, user_b)
    AND status = 'pending'
    AND NOT public.is_blocked_pair(user_a, user_b)
  );
CREATE POLICY "Participants can update their conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() IN (user_a, user_b))
  WITH CHECK (auth.uid() IN (user_a, user_b));

-- ============ messages ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND _user_id IN (c.user_a, c.user_b)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_send_message(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND _user_id IN (c.user_a, c.user_b)
      AND NOT public.is_blocked_pair(c.user_a, c.user_b)
      AND (
        c.status = 'accepted'
        OR (c.status = 'pending' AND c.requester_id = _user_id)
      )
  );
$$;

CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT TO authenticated USING (public.can_read_conversation(conversation_id, auth.uid()));
CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND public.can_send_message(conversation_id, auth.uid())
  );
CREATE POLICY "Senders can edit their messages" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Senders can delete their messages" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- ============ reports ============
CREATE TABLE public.conversation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conversation_reports TO authenticated;
GRANT ALL ON public.conversation_reports TO service_role;
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters see their reports" ON public.conversation_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Participants can report a conversation" ON public.conversation_reports
  FOR INSERT TO authenticated WITH CHECK (
    reporter_id = auth.uid() AND public.can_read_conversation(conversation_id, auth.uid())
  );

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  body text,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN (
    'message_received','message_request','collaborator_invited','collaborator_accepted'
  ))
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update their notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete their notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ triggers ============
CREATE TRIGGER conversations_touch BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER messages_touch BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.on_message_sent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  conv public.conversations;
  other uuid;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  other := CASE WHEN conv.user_a = NEW.sender_id THEN conv.user_b ELSE conv.user_a END;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = left(coalesce(nullif(NEW.body, ''), 'Photo'), 140)
  WHERE id = NEW.conversation_id;

  INSERT INTO public.notifications (user_id, actor_id, type, body, conversation_id, project_id)
  VALUES (
    other, NEW.sender_id,
    CASE WHEN conv.status = 'pending' THEN 'message_request' ELSE 'message_received' END,
    left(coalesce(nullif(NEW.body, ''), 'Sent a photo'), 140),
    NEW.conversation_id, conv.project_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_sent();

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;