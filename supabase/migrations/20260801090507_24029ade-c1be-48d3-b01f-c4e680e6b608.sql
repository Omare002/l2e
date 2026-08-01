-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 2 AND 30 AND username ~ '^[a-z0-9_-]+$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  avatar_url text,
  bio text CHECK (bio IS NULL OR char_length(bio) <= 400),
  github_url text,
  portfolio_url text,
  accent_color text NOT NULL DEFAULT '#7CFC00',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND is_demo = false);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND is_demo = false);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- =========================================================
-- PROJECTS
-- =========================================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  tagline text NOT NULL CHECK (char_length(tagline) BETWEEN 4 AND 140),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  demo_url text,
  github_url text,
  thumbnail_url text,
  category text NOT NULL CHECK (category IN ('Developer Tools','AI','Education','Community','Productivity','Design')),
  tech text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped','in_progress','prototype')),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_owner_idx ON public.projects(owner_id);
CREATE INDEX projects_created_idx ON public.projects(created_at DESC);

GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published projects are publicly viewable" ON public.projects FOR SELECT USING (published = true);
CREATE POLICY "Owners can view their own projects" ON public.projects FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their projects" ON public.projects FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete their projects" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- =========================================================
-- VOTES
-- =========================================================
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX votes_project_idx ON public.votes(project_id);
CREATE INDEX votes_user_idx ON public.votes(user_id);
CREATE INDEX votes_created_idx ON public.votes(created_at);

GRANT SELECT ON public.votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly viewable" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Users can vote as themselves" ON public.votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove their own vote" ON public.votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- ACTIVITY EVENTS
-- =========================================================
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('account_created','project_submitted','project_updated','project_upvoted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_created_idx ON public.activity_events(created_at DESC);
CREATE INDEX activity_actor_idx ON public.activity_events(actor_id);

GRANT SELECT ON public.activity_events TO anon;
GRANT SELECT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity is publicly viewable" ON public.activity_events FOR SELECT USING (true);

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Activity logging (server-authoritative: written by triggers only)
CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published THEN
      INSERT INTO public.activity_events (actor_id, project_id, type) VALUES (NEW.owner_id, NEW.id, 'project_submitted');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.published AND NOT OLD.published THEN
      INSERT INTO public.activity_events (actor_id, project_id, type) VALUES (NEW.owner_id, NEW.id, 'project_submitted');
    ELSIF NEW.published THEN
      INSERT INTO public.activity_events (actor_id, project_id, type) VALUES (NEW.owner_id, NEW.id, 'project_updated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_activity AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_activity();

CREATE OR REPLACE FUNCTION public.log_vote_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, project_id, type) VALUES (NEW.user_id, NEW.project_id, 'project_upvoted');
  RETURN NEW;
END;
$$;

CREATE TRIGGER votes_activity AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.log_vote_activity();

CREATE OR REPLACE FUNCTION public.on_profile_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_demo THEN
    -- The first real signup retires all demo accounts (and their projects/votes).
    DELETE FROM public.profiles WHERE is_demo = true;
    INSERT INTO public.activity_events (actor_id, type) VALUES (NEW.id, 'account_created');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_created AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created();

-- =========================================================
-- DYNAMIC VIEWS (rankings are never stored)
-- =========================================================
CREATE VIEW public.project_stats WITH (security_invoker = on) AS
SELECT
  p.id, p.owner_id, p.slug, p.title, p.tagline, p.description, p.demo_url, p.github_url,
  p.thumbnail_url, p.category, p.tech, p.status, p.published, p.created_at, p.updated_at,
  (SELECT count(*) FROM public.votes v WHERE v.project_id = p.id)::int AS vote_count,
  pf.username AS owner_username,
  pf.display_name AS owner_display_name,
  pf.avatar_url AS owner_avatar_url,
  pf.accent_color AS owner_accent_color,
  pf.is_demo AS owner_is_demo
FROM public.projects p
JOIN public.profiles pf ON pf.id = p.owner_id;

GRANT SELECT ON public.project_stats TO anon, authenticated;
GRANT ALL ON public.project_stats TO service_role;

CREATE VIEW public.leaderboard WITH (security_invoker = on) AS
WITH scored AS (
  SELECT
    pf.id,
    pf.username,
    pf.display_name,
    pf.avatar_url,
    pf.accent_color,
    pf.is_demo,
    pf.created_at,
    COALESCE((
      SELECT count(*) FROM public.votes v
      JOIN public.projects p ON p.id = v.project_id
      WHERE p.owner_id = pf.id AND p.published
    ), 0)::int AS score,
    COALESCE((
      SELECT count(*) FROM public.projects p WHERE p.owner_id = pf.id AND p.published
    ), 0)::int AS project_count
  FROM public.profiles pf
)
SELECT
  s.*,
  rank() OVER (ORDER BY s.score DESC, s.created_at ASC)::int AS rank,
  (SELECT p.title FROM public.projects p
     WHERE p.owner_id = s.id AND p.published
     ORDER BY (SELECT count(*) FROM public.votes v WHERE v.project_id = p.id) DESC, p.created_at DESC
     LIMIT 1) AS top_project_title,
  (SELECT p.slug FROM public.projects p
     WHERE p.owner_id = s.id AND p.published
     ORDER BY (SELECT count(*) FROM public.votes v WHERE v.project_id = p.id) DESC, p.created_at DESC
     LIMIT 1) AS top_project_slug
FROM scored s;

GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;

-- Daily rank history, computed live from vote timestamps
CREATE OR REPLACE FUNCTION public.rank_history(_profile_id uuid, _days int DEFAULT 7)
RETURNS TABLE (day date, rank int, score int)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH days AS (
    SELECT generate_series(
      (current_date - (GREATEST(_days, 1) - 1))::date,
      current_date,
      interval '1 day'
    )::date AS day
  ),
  scores AS (
    SELECT d.day, pf.id,
      COALESCE((
        SELECT count(*) FROM public.votes v
        JOIN public.projects p ON p.id = v.project_id
        WHERE p.owner_id = pf.id AND p.published AND v.created_at < (d.day + interval '1 day')
      ), 0)::int AS score,
      pf.created_at
    FROM days d CROSS JOIN public.profiles pf
  ),
  ranked AS (
    SELECT day, id, score,
      rank() OVER (PARTITION BY day ORDER BY score DESC, created_at ASC)::int AS rank
    FROM scores
  )
  SELECT day, rank, score FROM ranked WHERE id = _profile_id ORDER BY day;
$$;

GRANT EXECUTE ON FUNCTION public.rank_history(uuid, int) TO anon, authenticated, service_role;

-- =========================================================
-- REALTIME
-- =========================================================
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.activity_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;

-- =========================================================
-- DEMO CONTENT (auto-deleted on first real signup)
-- =========================================================
INSERT INTO public.profiles (id, username, display_name, bio, accent_color, is_demo, github_url, portfolio_url, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111','demo_alex','Alex (Demo)','Demo account. Shipping small tools that make indie building less lonely.','#7CFC00',true,'https://github.com','https://example.com', now() - interval '40 days'),
  ('22222222-2222-4222-8222-222222222222','demo_sam','Sam (Demo)','Demo account. On-device AI experiments that run entirely in the browser.','#A5A5A5',true,'https://github.com','https://example.com', now() - interval '32 days'),
  ('33333333-3333-4333-8333-333333333333','demo_kyle','Kyle (Demo)','Demo account. Type nerd and tooling maximalist.','#C08A6A',true,'https://github.com','https://example.com', now() - interval '25 days'),
  ('44444444-4444-4444-8444-444444444444','demo_jordan','Jordan (Demo)','Demo account. Building community software.','#7CFC00',true,'https://github.com','https://example.com', now() - interval '18 days');

INSERT INTO public.projects (id, owner_id, slug, title, tagline, description, demo_url, github_url, category, tech, status, published, created_at) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','demo-shipfast','ShipFast (Demo)','Real-time analytics for indie maker metrics.','Demo project. A streaming analytics dashboard for indie makers: every chart updates live with zero polling and onboarding takes about ninety seconds.','https://example.com','https://github.com','Developer Tools','{"Next.js","Postgres","Recharts"}','shipped',true, now() - interval '6 days'),
  ('aaaaaaa1-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','demo-cutout','Cutout (Demo)','Unlimited background removal, fully on-device.','Demo project. Free background removal that runs entirely in the browser using WebGPU, so no image ever leaves the machine.','https://example.com','https://github.com','AI','{"WebGPU","transformers.js"}','shipped',true, now() - interval '5 days'),
  ('aaaaaaa1-0000-4000-8000-000000000003','33333333-3333-4333-8333-333333333333','demo-typeforge','TypeForge (Demo)','Custom variable fonts from a single prompt.','Demo project. Generate variable fonts from a prompt and export them with a working font-face snippet.','https://example.com','https://github.com','Design','{"Canvas","TypeScript"}','shipped',true, now() - interval '4 days'),
  ('aaaaaaa1-0000-4000-8000-000000000004','44444444-4444-4444-8444-444444444444','demo-devmatch','DevMatch (Demo)','Find collaborators whose skills complement yours.','Demo project. A lightweight matching tool that pairs builders on complementary skills rather than an opaque ranking model.','https://example.com','https://github.com','Community','{"React","Postgres"}','in_progress',true, now() - interval '3 days');

INSERT INTO public.votes (project_id, user_id, created_at) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222', now() - interval '5 days'),
  ('aaaaaaa1-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333', now() - interval '4 days'),
  ('aaaaaaa1-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444', now() - interval '2 days'),
  ('aaaaaaa1-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111', now() - interval '4 days'),
  ('aaaaaaa1-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333', now() - interval '1 day'),
  ('aaaaaaa1-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111', now() - interval '2 days'),
  ('aaaaaaa1-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111', now() - interval '1 day');
