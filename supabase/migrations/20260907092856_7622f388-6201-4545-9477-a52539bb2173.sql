ALTER TABLE public.quest_participants ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

UPDATE public.quest_participants SET submitted_at = updated_at WHERE project_id IS NOT NULL AND submitted_at IS NULL;

CREATE OR REPLACE FUNCTION public.guard_quest_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.project_id IS NOT DISTINCT FROM OLD.project_id THEN RETURN NEW; END IF;

  SELECT creator_id, ends_at, closed_at INTO q FROM public.quests WHERE id = NEW.quest_id;
  IF q.creator_id = auth.uid() THEN RETURN NEW; END IF;

  IF q.closed_at IS NOT NULL OR q.ends_at <= now() THEN
    RAISE EXCEPTION 'Submissions are locked: this quest deadline has passed';
  END IF;

  NEW.submitted_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_quest_submission ON public.quest_participants;
CREATE TRIGGER guard_quest_submission
  BEFORE UPDATE ON public.quest_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_quest_submission();

ALTER TABLE public.discussions
  ADD COLUMN IF NOT EXISTS quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS discussions_quest_id_idx ON public.discussions(quest_id);

DROP VIEW IF EXISTS public.discussions_public;
CREATE VIEW public.discussions_public
WITH (security_invoker = false) AS
SELECT d.id,
  d.title,
  d.body,
  d.category,
  d.pinned,
  d.last_activity_at,
  d.created_at,
  d.updated_at,
  d.quest_id,
  (SELECT q.title FROM public.quests q
    WHERE q.id = d.quest_id AND q.visibility = 'public') AS quest_title,
  CASE WHEN auth.uid() IS NOT NULL THEN d.author_id ELSE NULL::uuid END AS author_id,
  jsonb_build_object('username', pf.username, 'display_name', pf.display_name,
    'avatar_url', pf.avatar_url, 'accent_color', pf.accent_color) AS author,
  ((SELECT count(*) FROM public.discussion_replies r WHERE r.discussion_id = d.id))::integer AS reply_count
FROM public.discussions d
LEFT JOIN public.profiles pf ON pf.id = d.author_id;

GRANT SELECT ON public.discussions_public TO anon, authenticated, service_role;