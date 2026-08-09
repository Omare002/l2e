-- ============================================================
-- 1. Messaging fix: RLS helper functions need EXECUTE
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_message(uuid, uuid) TO authenticated;

-- ============================================================
-- 2. Follows
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see follows involving them"
  ON public.follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can follow as themselves"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (
    follower_id = auth.uid()
    AND following_id <> auth.uid()
    AND NOT public.is_blocked_pair(follower_id, following_id)
  );

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- Public, identity-free follower/following counts.
CREATE OR REPLACE VIEW public.follow_counts WITH (security_invoker = off) AS
  SELECT
    pf.id AS profile_id,
    pf.username,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = pf.id)::int AS followers,
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = pf.id)::int AS following
  FROM public.profiles pf;

GRANT SELECT ON public.follow_counts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_follow_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'new_follower');
  RETURN NEW;
END;
$$;

CREATE TRIGGER follows_notify
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.on_follow_created();

-- ============================================================
-- 3. Project collaborators
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.owner_id = _user_id
  );
$$;

CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_collaborators_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT project_collaborators_unique UNIQUE (project_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_collaborators TO authenticated;
GRANT ALL ON public.project_collaborators TO service_role;

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see relevant collaborations"
  ON public.project_collaborators FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR status = 'accepted'
    OR public.is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "Owners can invite collaborators"
  ON public.project_collaborators FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND user_id <> auth.uid()
    AND status = 'pending'
    AND public.is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "Invitee or owner can update a collaboration"
  ON public.project_collaborators FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()));

CREATE POLICY "Invitee or owner can remove a collaboration"
  ON public.project_collaborators FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()));

CREATE TRIGGER project_collaborators_touch
BEFORE UPDATE ON public.project_collaborators
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.on_collaborator_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, project_id)
    VALUES (NEW.user_id, NEW.invited_by, 'collaborator_invited', NEW.project_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    INSERT INTO public.notifications (user_id, actor_id, type, project_id)
    VALUES (
      NEW.invited_by,
      NEW.user_id,
      CASE WHEN NEW.status = 'accepted' THEN 'collaborator_accepted' ELSE 'collaborator_declined' END,
      NEW.project_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_collaborators_notify
AFTER INSERT OR UPDATE ON public.project_collaborators
FOR EACH ROW EXECUTE FUNCTION public.on_collaborator_change();

-- Public "Built by" list: account IDs stay hidden from anonymous visitors.
CREATE OR REPLACE VIEW public.project_collaborators_public WITH (security_invoker = off) AS
  SELECT
    pc.id,
    pc.project_id,
    CASE WHEN auth.uid() IS NOT NULL THEN pc.user_id ELSE NULL::uuid END AS user_id,
    pc.can_edit,
    pc.created_at,
    pf.username,
    pf.display_name,
    pf.avatar_url,
    pf.accent_color
  FROM public.project_collaborators pc
  JOIN public.profiles pf ON pf.id = pc.user_id
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.status = 'accepted' AND (p.published OR p.owner_id = auth.uid());

GRANT SELECT ON public.project_collaborators_public TO anon, authenticated;

-- Collaborators with edit rights may edit the project.
CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = _project_id
      AND pc.user_id = _user_id
      AND pc.status = 'accepted'
      AND pc.can_edit
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO authenticated;

CREATE POLICY "Editors can view the project"
  ON public.projects FOR SELECT TO authenticated
  USING (public.can_edit_project(id, auth.uid()));

CREATE POLICY "Editors can update the project"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.can_edit_project(id, auth.uid()))
  WITH CHECK (public.can_edit_project(id, auth.uid()));

-- Ownership can only ever be changed by the current owner.
CREATE OR REPLACE FUNCTION public.guard_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id AND auth.uid() IS NOT NULL AND auth.uid() <> OLD.owner_id THEN
    RAISE EXCEPTION 'Only the owner can transfer a project';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_guard_owner
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_project_owner();

-- ============================================================
-- 4. Community feed: only meaningful public builder activity
-- ============================================================
DROP TRIGGER IF EXISTS votes_activity ON public.votes;
DROP TRIGGER IF EXISTS comments_activity ON public.comments;

-- Forum replies bump the discussion but no longer create feed noise.
CREATE OR REPLACE FUNCTION public.on_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discussions SET last_activity_at = now() WHERE id = NEW.discussion_id;
  RETURN NEW;
END;
$$;

-- Only meaningful project changes count as an update, at most once an hour.
CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meaningful boolean;
  recent boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published THEN
      INSERT INTO public.activity_events (actor_id, project_id, type)
      VALUES (NEW.owner_id, NEW.id, 'project_submitted');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.published AND NOT OLD.published THEN
    INSERT INTO public.activity_events (actor_id, project_id, type)
    VALUES (NEW.owner_id, NEW.id, 'project_submitted');
    RETURN NEW;
  END IF;

  IF NOT NEW.published THEN
    RETURN NEW;
  END IF;

  meaningful :=
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.tagline IS DISTINCT FROM OLD.tagline
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.demo_url IS DISTINCT FROM OLD.demo_url
    OR NEW.github_url IS DISTINCT FROM OLD.github_url
    OR NEW.thumbnail_url IS DISTINCT FROM OLD.thumbnail_url
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.tech IS DISTINCT FROM OLD.tech;

  IF NOT meaningful THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.activity_events a
    WHERE a.project_id = NEW.id
      AND a.type IN ('project_updated', 'project_submitted')
      AND a.created_at > now() - interval '1 hour'
  ) INTO recent;

  IF NOT recent THEN
    INSERT INTO public.activity_events (actor_id, project_id, type)
    VALUES (NEW.owner_id, NEW.id, 'project_updated');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.activity_public WITH (security_invoker = off) AS
  SELECT
    a.id,
    a.type,
    a.created_at,
    a.project_id,
    CASE WHEN auth.uid() IS NOT NULL THEN a.actor_id ELSE NULL::uuid END AS actor_id,
    pf.username AS actor_username,
    jsonb_build_object(
      'username', pf.username,
      'display_name', pf.display_name,
      'avatar_url', pf.avatar_url,
      'accent_color', pf.accent_color
    ) AS actor,
    CASE WHEN p.id IS NULL THEN NULL::jsonb
      ELSE jsonb_build_object('slug', p.slug, 'title', p.title, 'tagline', p.tagline) END AS project
  FROM public.activity_events a
  LEFT JOIN public.profiles pf ON pf.id = a.actor_id
  LEFT JOIN public.projects p ON p.id = a.project_id AND p.published
  WHERE a.type IN (
    'project_submitted',
    'project_updated',
    'account_created',
    'discussion_created',
    'project_featured',
    'leaderboard_milestone',
    'weekly_winner'
  );

GRANT SELECT ON public.activity_public TO anon, authenticated;

-- ============================================================
-- 5. Accurate unread message counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.my_unread_counts()
RETURNS TABLE(conversation_id uuid, unread integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, count(m.id)::int
  FROM public.conversations c
  JOIN public.messages m ON m.conversation_id = c.id AND m.sender_id <> auth.uid()
  WHERE auth.uid() IN (c.user_a, c.user_b)
    AND m.created_at > COALESCE(
      CASE WHEN c.user_a = auth.uid() THEN c.read_a_at ELSE c.read_b_at END,
      '-infinity'::timestamptz
    )
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO authenticated;

-- ============================================================
-- 6. Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;