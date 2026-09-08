GRANT SELECT ON public.profiles TO anon;

CREATE OR REPLACE FUNCTION private.public_quest_title(_quest_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.title FROM public.quests q WHERE q.id = _quest_id AND q.visibility = 'public';
$$;

REVOKE ALL ON FUNCTION private.public_quest_title(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.public_quest_title(uuid) TO anon, authenticated, service_role;

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
  private.public_quest_title(d.quest_id) AS quest_title,
  CASE WHEN auth.uid() IS NOT NULL THEN d.author_id ELSE NULL::uuid END AS author_id,
  jsonb_build_object('username', pf.username, 'display_name', pf.display_name, 'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author,
  (SELECT count(*) FROM public.discussion_replies r WHERE r.discussion_id = d.id)::integer AS reply_count
FROM public.discussions d
LEFT JOIN public.profiles pf ON pf.id = d.author_id;

GRANT SELECT ON public.discussions_public TO anon, authenticated, service_role;