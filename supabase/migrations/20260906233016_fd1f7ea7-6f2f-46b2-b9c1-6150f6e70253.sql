CREATE OR REPLACE FUNCTION public.is_quest_member(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quest_participants p
    WHERE p.quest_id = _quest_id AND p.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id AND q.creator_id = _user_id
  );
$$;