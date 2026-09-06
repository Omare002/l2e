CREATE TABLE public.weekly_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week integer NOT NULL,
  year integer NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, week)
);

GRANT SELECT ON public.weekly_tasks TO anon;
GRANT SELECT ON public.weekly_tasks TO authenticated;
GRANT ALL ON public.weekly_tasks TO service_role;

ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly tasks are public" ON public.weekly_tasks FOR SELECT USING (true);

CREATE TRIGGER weekly_tasks_touch BEFORE UPDATE ON public.weekly_tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.weekly_tasks(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'group',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_votes integer,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.quests TO authenticated;
GRANT ALL ON public.quests TO service_role;

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quests are public" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Members create their own quests" ON public.quests FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update their quests" ON public.quests FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE TRIGGER quests_touch BEFORE UPDATE ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.quest_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'invited',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, user_id)
);

GRANT SELECT ON public.quest_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_participants TO authenticated;
GRANT ALL ON public.quest_participants TO service_role;

ALTER TABLE public.quest_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest participants are public" ON public.quest_participants FOR SELECT USING (true);

CREATE POLICY "Invite or join a quest" ON public.quest_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.creator_id = auth.uid())
);

CREATE POLICY "Update own participation" ON public.quest_participants FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.creator_id = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.creator_id = auth.uid())
);

CREATE POLICY "Leave a quest" ON public.quest_participants FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.creator_id = auth.uid())
);

CREATE TRIGGER quest_participants_touch BEFORE UPDATE ON public.quest_participants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_quest_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invited_by IS NOT NULL AND NEW.invited_by <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, body)
    VALUES (NEW.user_id, NEW.invited_by, 'quest_invited',
      (SELECT left(q.title, 140) FROM public.quests q WHERE q.id = NEW.quest_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quest_participants_notify AFTER INSERT ON public.quest_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_quest_invite();

CREATE OR REPLACE FUNCTION public.quest_standings(_quest_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  accent_color text,
  status text,
  project_id uuid,
  project_title text,
  project_slug text,
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
    pa.project_id,
    p.title,
    p.slug,
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

GRANT EXECUTE ON FUNCTION public.quest_standings(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_finished_quests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
  best record;
  closed integer := 0;
BEGIN
  FOR q IN SELECT * FROM public.quests WHERE closed_at IS NULL AND ends_at <= now() LOOP
    SELECT * INTO best FROM public.quest_standings(q.id)
      WHERE status = 'accepted' AND project_id IS NOT NULL
      ORDER BY votes DESC LIMIT 1;

    UPDATE public.quests
    SET closed_at = now(),
        winner_id = CASE WHEN best.user_id IS NOT NULL AND best.votes > 0 THEN best.user_id ELSE NULL END,
        winner_votes = CASE WHEN best.user_id IS NOT NULL AND best.votes > 0 THEN best.votes ELSE NULL END
    WHERE id = q.id;

    IF best.user_id IS NOT NULL AND best.votes > 0 THEN
      INSERT INTO public.notifications (user_id, actor_id, type, body)
      VALUES (best.user_id, NULL, 'quest_won', left(q.title, 140));
    END IF;

    closed := closed + 1;
  END LOOP;
  RETURN closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_finished_quests() TO anon, authenticated, service_role;

INSERT INTO public.weekly_tasks (week, year, title, prompt, starts_at, ends_at)
SELECT
  d.week,
  d.year,
  d.title,
  d.prompt,
  d.starts_at,
  d.starts_at + interval '7 days'
FROM (
  VALUES
    (
      EXTRACT(week FROM date_trunc('week', now()))::int,
      EXTRACT(isoyear FROM date_trunc('week', now()))::int,
      'Build a landing page',
      'Ship a single, focused landing page for a real or imagined product. Clear headline, one call to action, no filler.',
      date_trunc('week', now())
    ),
    (
      EXTRACT(week FROM date_trunc('week', now()) + interval '7 days')::int,
      EXTRACT(isoyear FROM date_trunc('week', now()) + interval '7 days')::int,
      'A tool you use daily',
      'Build the small utility you keep wishing existed. Solve one problem end to end.',
      date_trunc('week', now()) + interval '7 days'
    ),
    (
      EXTRACT(week FROM date_trunc('week', now()) + interval '14 days')::int,
      EXTRACT(isoyear FROM date_trunc('week', now()) + interval '14 days')::int,
      'Make data beautiful',
      'Take any dataset and make it readable at a glance. One chart done well beats five done fast.',
      date_trunc('week', now()) + interval '14 days'
    )
) AS d(week, year, title, prompt, starts_at)
ON CONFLICT (year, week) DO NOTHING;