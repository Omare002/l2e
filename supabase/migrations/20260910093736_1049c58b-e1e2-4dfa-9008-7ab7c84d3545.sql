CREATE OR REPLACE FUNCTION public.is_quest_member(_quest_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quest_participants p
    WHERE p.quest_id = _quest_id AND p.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id AND q.creator_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quest_creator(_quest_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id AND q.creator_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_open_quest(_quest_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id
      AND q.closed_at IS NULL
      AND q.visibility = 'public'
      AND q.kind = ANY (ARRAY['group','shared_task'])
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_quest_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_quest_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_open_quest(uuid) TO authenticated;

DROP POLICY IF EXISTS "Quests are readable by members" ON public.quests;
CREATE POLICY "Quests are readable by members" ON public.quests
FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR creator_id = auth.uid()
  OR public.is_quest_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Quest participants readable by involved members" ON public.quest_participants;
CREATE POLICY "Quest participants readable by involved members" ON public.quest_participants
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = invited_by
  OR public.is_quest_creator(quest_id, auth.uid())
);

DROP POLICY IF EXISTS "Invite or join a quest" ON public.quest_participants;
CREATE POLICY "Invite or join a quest" ON public.quest_participants
FOR INSERT TO authenticated
WITH CHECK (
  public.is_quest_creator(quest_id, auth.uid())
  OR (
    auth.uid() = user_id
    AND status = 'accepted'
    AND invited_by IS NULL
    AND public.is_open_quest(quest_id)
  )
);

DROP POLICY IF EXISTS "Creators manage participation" ON public.quest_participants;
CREATE POLICY "Creators manage participation" ON public.quest_participants
FOR UPDATE TO authenticated
USING (public.is_quest_creator(quest_id, auth.uid()))
WITH CHECK (public.is_quest_creator(quest_id, auth.uid()));

DROP POLICY IF EXISTS "Leave a quest" ON public.quest_participants;
CREATE POLICY "Leave a quest" ON public.quest_participants
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_quest_creator(quest_id, auth.uid()));