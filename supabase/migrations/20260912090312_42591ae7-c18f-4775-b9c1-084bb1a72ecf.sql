CREATE OR REPLACE FUNCTION public.is_quest_creator(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() = _user_id
    AND EXISTS (
      SELECT 1
      FROM public.quests q
      WHERE q.id = _quest_id
        AND q.creator_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_quest_member(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() = _user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.quest_participants p
        WHERE p.quest_id = _quest_id
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.quests q
        WHERE q.id = _quest_id
          AND q.creator_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_quest_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_quest_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quest_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_quest_member(uuid, uuid) TO authenticated, service_role;