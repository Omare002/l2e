-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = _user_id AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Members read their own roles" ON public.user_roles;
CREATE POLICY "Members read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- 2. Enums for reports
DO $$ BEGIN
  CREATE TYPE public.report_target AS ENUM ('project', 'discussion', 'discussion_reply', 'comment', 'profile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM ('copied_project','copyright','impersonation','spam','harassment','off_topic','misleading','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('new','reviewing','action_taken','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.moderation_action AS ENUM ('dismiss','warn','hide_content','unhide_content','suspend_account','unsuspend_account');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason public.report_reason NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'new',
  resolution_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX reports_status_idx ON public.reports (status, created_at DESC);
CREATE INDEX reports_target_idx ON public.reports (target_type, target_id);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters see their own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Members file their own reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND (reported_user_id IS NULL OR reported_user_id <> auth.uid()));

CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Moderation actions (staff only)
CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  moderator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action public.moderation_action NOT NULL,
  target_type public.report_target,
  target_id uuid,
  affected_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_created_idx ON public.moderation_actions (created_at DESC);
GRANT SELECT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read moderation actions" ON public.moderation_actions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- 5. Copyright complaints (staff read only; writes go through the server)
CREATE TABLE public.copyright_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_organisation text,
  claimant_address text,
  copyrighted_work text NOT NULL,
  original_url text,
  infringing_url text NOT NULL,
  infringing_description text,
  good_faith boolean NOT NULL DEFAULT false,
  accuracy_statement boolean NOT NULL DEFAULT false,
  signature text NOT NULL,
  status public.report_status NOT NULL DEFAULT 'new',
  resolution_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.copyright_complaints TO authenticated;
GRANT ALL ON public.copyright_complaints TO service_role;
ALTER TABLE public.copyright_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read copyright complaints" ON public.copyright_complaints
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER copyright_complaints_touch BEFORE UPDATE ON public.copyright_complaints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Moderation state on existing content (never deleted, only hidden)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.discussion_replies ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 7. Public views skip hidden content
CREATE OR REPLACE VIEW public.comments_public AS
 SELECT c.id, c.project_id, c.body, c.kind, c.created_at, c.updated_at,
    CASE WHEN auth.uid() IS NOT NULL THEN c.author_id ELSE NULL::uuid END AS author_id,
    jsonb_build_object('username', pf.username, 'display_name', pf.display_name, 'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author
   FROM comments c
     LEFT JOIN profiles pf ON pf.id = c.author_id
  WHERE NOT c.hidden;

CREATE OR REPLACE VIEW public.discussion_replies_public AS
 SELECT r.id, r.discussion_id, r.body, r.created_at, r.updated_at,
    CASE WHEN auth.uid() IS NOT NULL THEN r.author_id ELSE NULL::uuid END AS author_id,
    jsonb_build_object('username', pf.username, 'display_name', pf.display_name, 'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author
   FROM discussion_replies r
     LEFT JOIN profiles pf ON pf.id = r.author_id
  WHERE NOT r.hidden;

CREATE OR REPLACE VIEW public.discussions_public AS
 SELECT d.id, d.title, d.body, d.category, d.pinned, d.last_activity_at, d.created_at, d.updated_at, d.quest_id,
    private.public_quest_title(d.quest_id) AS quest_title,
    CASE WHEN auth.uid() IS NOT NULL THEN d.author_id ELSE NULL::uuid END AS author_id,
    jsonb_build_object('username', pf.username, 'display_name', pf.display_name, 'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author,
    (( SELECT count(*) FROM discussion_replies r WHERE r.discussion_id = d.id AND NOT r.hidden))::integer AS reply_count
   FROM discussions d
     LEFT JOIN profiles pf ON pf.id = d.author_id
  WHERE NOT d.hidden;

CREATE OR REPLACE VIEW public.project_stats AS
 SELECT p.id, p.owner_id, p.slug, p.title, p.tagline, p.description, p.demo_url, p.github_url,
    p.thumbnail_url, p.category, p.tech, p.status, p.published, p.created_at, p.updated_at,
    (( SELECT count(*) FROM votes v WHERE v.project_id = p.id))::integer AS vote_count,
    (( SELECT count(*) FROM comments c WHERE c.project_id = p.id AND NOT c.hidden))::integer AS comment_count,
    pf.username AS owner_username, pf.display_name AS owner_display_name,
    pf.avatar_url AS owner_avatar_url, pf.accent_color AS owner_accent_color, pf.is_demo AS owner_is_demo
   FROM projects p
     JOIN profiles pf ON pf.id = p.owner_id
  WHERE (p.published AND NOT p.hidden) OR p.owner_id = auth.uid();
