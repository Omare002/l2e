-- 1. Quest membership helpers: always answer for the caller, never a client-supplied id.
CREATE OR REPLACE FUNCTION public.is_quest_member(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quest_participants p
    WHERE p.quest_id = _quest_id
      AND p.user_id = COALESCE(auth.uid(), _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id
      AND q.creator_id = COALESCE(auth.uid(), _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quest_creator(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id
      AND q.creator_id = COALESCE(auth.uid(), _user_id)
  );
$$;

-- 2. Activity events: no direct client reads, no realtime stream of raw actor ids.
DROP POLICY IF EXISTS "Members can view activity" ON public.activity_events;

REVOKE SELECT ON public.activity_events FROM anon;
REVOKE SELECT ON public.activity_events FROM authenticated;
GRANT ALL ON public.activity_events TO service_role;

ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_events;
