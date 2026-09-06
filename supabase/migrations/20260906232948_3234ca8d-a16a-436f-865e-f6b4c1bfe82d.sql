-- 1. Membership helper (security definer avoids policy recursion)
CREATE OR REPLACE FUNCTION public.is_quest_member(_quest_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quest_participants p
    WHERE p.quest_id = _quest_id AND p.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = _quest_id AND q.creator_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_quest_member(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_quest_member(uuid, uuid) TO authenticated, service_role;

-- 2. Quest chat
CREATE TABLE public.quest_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quest_messages_quest_created_idx ON public.quest_messages (quest_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_messages TO authenticated;
GRANT ALL ON public.quest_messages TO service_role;

ALTER TABLE public.quest_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest members can read the quest chat"
ON public.quest_messages FOR SELECT TO authenticated
USING (public.is_quest_member(quest_id, auth.uid()));

CREATE POLICY "Quest members can post"
ON public.quest_messages FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.is_quest_member(quest_id, auth.uid()));

CREATE POLICY "Authors can edit their own messages"
ON public.quest_messages FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their own messages"
ON public.quest_messages FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE TRIGGER quest_messages_touch BEFORE UPDATE ON public.quest_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_messages;

-- 3. Standings gain progress columns: when they joined and entry state
DROP FUNCTION IF EXISTS public.quest_standings(uuid);

CREATE OR REPLACE FUNCTION public.quest_standings(_quest_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  accent_color text,
  status text,
  joined_at timestamptz,
  project_id uuid,
  project_title text,
  project_slug text,
  project_published boolean,
  project_status text,
  votes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.user_id,
    pf.username,
    pf.display_name,
    pf.avatar_url,
    pf.accent_color,
    pa.status,
    pa.created_at AS joined_at,
    pa.project_id,
    p.title,
    p.slug,
    p.published,
    p.status,
    COALESCE((
      SELECT count(*) FROM public.votes v
      JOIN public.quests q ON q.id = pa.quest_id
      WHERE v.project_id = pa.project_id
        AND v.created_at >= q.starts_at
        AND v.created_at < q.ends_at
    ), 0)::int AS votes
  FROM public.quest_participants pa
  JOIN public.profiles pf ON pf.id = pa.user_id
  LEFT JOIN public.projects p ON p.id = pa.project_id
  WHERE pa.quest_id = _quest_id
  ORDER BY votes DESC, pf.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.quest_standings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quest_standings(uuid) TO service_role;