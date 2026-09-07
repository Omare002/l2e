ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.quests
  DROP CONSTRAINT IF EXISTS quests_visibility_check;
ALTER TABLE public.quests
  ADD CONSTRAINT quests_visibility_check CHECK (visibility IN ('public','private'));

DROP POLICY IF EXISTS "Invite or join a quest" ON public.quest_participants;
CREATE POLICY "Invite or join a quest"
ON public.quest_participants
FOR INSERT
TO authenticated
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
        AND q.closed_at IS NULL
        AND q.visibility = 'public'
        AND q.kind IN ('group','shared_task')
    )
  )
);