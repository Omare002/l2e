CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_view_quest_discussion(_quest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _quest_id IS NULL
    OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = _quest_id AND q.visibility = 'public')
    OR (auth.uid() IS NOT NULL AND (
          EXISTS (SELECT 1 FROM public.quests q WHERE q.id = _quest_id AND q.creator_id = auth.uid())
       OR EXISTS (SELECT 1 FROM public.quest_participants p WHERE p.quest_id = _quest_id AND p.user_id = auth.uid())
    ));
$$;

REVOKE ALL ON FUNCTION private.can_view_quest_discussion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_quest_discussion(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Visible discussions are readable" ON public.discussions;
CREATE POLICY "Visible discussions are readable"
  ON public.discussions FOR SELECT
  TO anon, authenticated
  USING (private.can_view_quest_discussion(quest_id));

DROP POLICY IF EXISTS "Visible replies are readable" ON public.discussion_replies;
CREATE POLICY "Visible replies are readable"
  ON public.discussion_replies FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND private.can_view_quest_discussion(d.quest_id)
  ));

DROP FUNCTION IF EXISTS public.can_view_quest_discussion(uuid);