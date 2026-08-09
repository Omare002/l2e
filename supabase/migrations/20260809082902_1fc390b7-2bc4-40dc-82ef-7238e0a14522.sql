-- 1. Aggregate views must keep working for signed-out visitors
CREATE OR REPLACE VIEW public.project_stats AS
  SELECT p.id, p.owner_id, p.slug, p.title, p.tagline, p.description, p.demo_url, p.github_url,
         p.thumbnail_url, p.category, p.tech, p.status, p.published, p.created_at, p.updated_at,
         (SELECT count(*) FROM public.votes v WHERE v.project_id = p.id)::int AS vote_count,
         (SELECT count(*) FROM public.comments c WHERE c.project_id = p.id)::int AS comment_count,
         pf.username AS owner_username, pf.display_name AS owner_display_name,
         pf.avatar_url AS owner_avatar_url, pf.accent_color AS owner_accent_color,
         pf.is_demo AS owner_is_demo
    FROM public.projects p
    JOIN public.profiles pf ON pf.id = p.owner_id
   WHERE p.published OR p.owner_id = auth.uid();
ALTER VIEW public.project_stats SET (security_invoker = off);
ALTER VIEW public.leaderboard SET (security_invoker = off);

-- 2. Public counters for guests
CREATE OR REPLACE VIEW public.community_totals AS
  SELECT (SELECT count(*) FROM public.profiles)::int AS builders,
         (SELECT count(*) FROM public.projects WHERE published)::int AS projects_published,
         (SELECT count(*) FROM public.votes)::int AS upvotes,
         (SELECT count(*) FROM public.votes WHERE created_at >= now() - interval '7 days')::int AS upvotes_week,
         (SELECT count(*) FROM public.projects WHERE published AND created_at >= now() - interval '7 days')::int AS projects_week;
ALTER VIEW public.community_totals SET (security_invoker = off);
GRANT SELECT ON public.community_totals TO anon, authenticated;

-- 3. Identity-free public views
CREATE OR REPLACE VIEW public.comments_public AS
  SELECT c.id, c.project_id, c.body, c.kind, c.created_at, c.updated_at,
         CASE WHEN auth.uid() IS NOT NULL THEN c.author_id ELSE NULL::uuid END AS author_id,
         jsonb_build_object('username', pf.username, 'display_name', pf.display_name,
                            'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author
    FROM public.comments c
    LEFT JOIN public.profiles pf ON pf.id = c.author_id;
ALTER VIEW public.comments_public SET (security_invoker = off);
GRANT SELECT ON public.comments_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.discussions_public AS
  SELECT d.id, d.title, d.body, d.category, d.pinned, d.last_activity_at, d.created_at, d.updated_at,
         CASE WHEN auth.uid() IS NOT NULL THEN d.author_id ELSE NULL::uuid END AS author_id,
         jsonb_build_object('username', pf.username, 'display_name', pf.display_name,
                            'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author,
         (SELECT count(*) FROM public.discussion_replies r WHERE r.discussion_id = d.id)::int AS reply_count
    FROM public.discussions d
    LEFT JOIN public.profiles pf ON pf.id = d.author_id;
ALTER VIEW public.discussions_public SET (security_invoker = off);
GRANT SELECT ON public.discussions_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.discussion_replies_public AS
  SELECT r.id, r.discussion_id, r.body, r.created_at, r.updated_at,
         CASE WHEN auth.uid() IS NOT NULL THEN r.author_id ELSE NULL::uuid END AS author_id,
         jsonb_build_object('username', pf.username, 'display_name', pf.display_name,
                            'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author
    FROM public.discussion_replies r
    LEFT JOIN public.profiles pf ON pf.id = r.author_id;
ALTER VIEW public.discussion_replies_public SET (security_invoker = off);
GRANT SELECT ON public.discussion_replies_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.activity_public AS
  SELECT a.id, a.type, a.created_at, a.project_id,
         CASE WHEN auth.uid() IS NOT NULL THEN a.actor_id ELSE NULL::uuid END AS actor_id,
         pf.username AS actor_username,
         jsonb_build_object('username', pf.username, 'display_name', pf.display_name,
                            'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS actor,
         CASE WHEN p.id IS NULL THEN NULL::jsonb
              ELSE jsonb_build_object('slug', p.slug, 'title', p.title) END AS project
    FROM public.activity_events a
    LEFT JOIN public.profiles pf ON pf.id = a.actor_id
    LEFT JOIN public.projects p ON p.id = a.project_id AND p.published;
ALTER VIEW public.activity_public SET (security_invoker = off);
GRANT SELECT ON public.activity_public TO anon, authenticated;

-- 4. Base tables: no anonymous direct reads
DROP POLICY IF EXISTS "Comments are publicly viewable" ON public.comments;
CREATE POLICY "Members can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.comments FROM anon;

DROP POLICY IF EXISTS "Discussions are publicly viewable" ON public.discussions;
CREATE POLICY "Members can view discussions" ON public.discussions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.discussions FROM anon;

DROP POLICY IF EXISTS "Replies are publicly viewable" ON public.discussion_replies;
CREATE POLICY "Members can view replies" ON public.discussion_replies FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.discussion_replies FROM anon;

DROP POLICY IF EXISTS "Activity is publicly viewable" ON public.activity_events;
CREATE POLICY "Members can view activity" ON public.activity_events FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.activity_events FROM anon;

DROP POLICY IF EXISTS "Votes are publicly viewable" ON public.votes;
CREATE POLICY "Members can view votes" ON public.votes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.votes FROM anon;