DROP POLICY "Invite or join a quest" ON public.quest_participants;
CREATE POLICY "Invite or join a quest" ON public.quest_participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = quest_participants.quest_id AND q.creator_id = auth.uid()
  )
  OR (
    auth.uid() = user_id
    AND status = 'accepted'
    AND invited_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_participants.quest_id
        AND q.kind IN ('n', 'n_task')
        AND q.closed_at IS NULL
    )
  )
);

DROP POLICY "Update own participation" ON public.quest_participants;
CREATE POLICY "Creators manage participation" ON public.quest_participants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = quest_participants.quest_id AND q.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = quest_participants.quest_id AND q.creator_id = auth.uid()
  )
);

CREATE POLICY "Members update own participation" ON public.quest_participants
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_quest_participant_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_creator boolean;
BEGIN
  -- Service role (auth.uid() IS NULL) and the quest creator manage rows freely.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = NEW.quest_id AND q.creator_id = auth.uid()
  ) INTO is_creator;

  IF is_creator THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id OR NEW.quest_id <> OLD.quest_id THEN
      RAISE EXCEPTION 'Quest participation cannot be transferred';
    END IF;

    -- A member may only answer an invitation (invited -> accepted/declined)
    -- or change their mind after declining (declined -> accepted).
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'invited' AND NEW.status IN ('accepted', 'declined'))
        OR (OLD.status = 'declined' AND NEW.status = 'accepted')
      ) THEN
        RAISE EXCEPTION 'You cannot change your quest status that way';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quest_participants_guard_status
BEFORE INSERT OR UPDATE ON public.quest_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_quest_participant_status();