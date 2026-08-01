CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1000),
  kind text NOT NULL DEFAULT 'feedback' CHECK (kind IN ('feedback','question','celebration')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_project_idx ON public.comments(project_id, created_at DESC);

GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are publicly viewable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can comment as themselves" ON public.comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update their comments" ON public.comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete their comments" ON public.comments FOR DELETE TO authenticated USING (author_id = auth.uid());

ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

DROP VIEW public.project_stats;
CREATE VIEW public.project_stats WITH (security_invoker = on) AS
SELECT
  p.id, p.owner_id, p.slug, p.title, p.tagline, p.description, p.demo_url, p.github_url,
  p.thumbnail_url, p.category, p.tech, p.status, p.published, p.created_at, p.updated_at,
  (SELECT count(*) FROM public.votes v WHERE v.project_id = p.id)::int AS vote_count,
  (SELECT count(*) FROM public.comments c WHERE c.project_id = p.id)::int AS comment_count,
  pf.username AS owner_username,
  pf.display_name AS owner_display_name,
  pf.avatar_url AS owner_avatar_url,
  pf.accent_color AS owner_accent_color,
  pf.is_demo AS owner_is_demo
FROM public.projects p
JOIN public.profiles pf ON pf.id = p.owner_id;

GRANT SELECT ON public.project_stats TO anon, authenticated;
GRANT ALL ON public.project_stats TO service_role;

INSERT INTO public.comments (project_id, author_id, body, kind) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','Demo comment. The streaming chart is buttery — how are you batching updates?','question'),
  ('aaaaaaa1-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333','Demo comment. Cleanest onboarding in the cohort.','celebration'),
  ('aaaaaaa1-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Demo comment. On-device is the right call — privacy sells itself.','celebration');