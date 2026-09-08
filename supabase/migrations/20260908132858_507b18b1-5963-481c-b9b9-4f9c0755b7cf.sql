-- Helper: can the current user see a discussion attached to _quest_id?
CREATE OR REPLACE FUNCTION public.can_view_quest_discussion(_quest_id uuid)
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

REVOKE ALL ON FUNCTION public.can_view_quest_discussion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_quest_discussion(uuid) TO anon, authenticated, service_role;

-- Discussions: restrict reads by quest visibility / membership
DROP POLICY IF EXISTS "Members can view discussions" ON public.discussions;
CREATE POLICY "Visible discussions are readable"
  ON public.discussions FOR SELECT
  TO anon, authenticated
  USING (public.can_view_quest_discussion(quest_id));

-- Replies inherit the parent discussion's visibility
DROP POLICY IF EXISTS "Members can view replies" ON public.discussion_replies;
CREATE POLICY "Visible replies are readable"
  ON public.discussion_replies FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND public.can_view_quest_discussion(d.quest_id)
  ));

GRANT SELECT ON public.discussions TO anon;
GRANT SELECT ON public.discussion_replies TO anon;

-- Public listing view must enforce RLS instead of bypassing it
DROP VIEW IF EXISTS public.discussions_public;
CREATE VIEW public.discussions_public WITH (security_invoker = on) AS
SELECT d.id,
  d.title,
  d.body,
  d.category,
  d.pinned,
  d.last_activity_at,
  d.created_at,
  d.updated_at,
  d.quest_id,
  (SELECT q.title FROM public.quests q WHERE q.id = d.quest_id AND q.visibility = 'public') AS quest_title,
  CASE WHEN auth.uid() IS NOT NULL THEN d.author_id ELSE NULL::uuid END AS author_id,
  jsonb_build_object('username', pf.username, 'display_name', pf.display_name, 'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author,
  (SELECT count(*) FROM public.discussion_replies r WHERE r.discussion_id = d.id)::integer AS reply_count
FROM public.discussions d
LEFT JOIN public.profiles pf ON pf.id = d.author_id;

GRANT SELECT ON public.discussions_public TO anon, authenticated, service_role;