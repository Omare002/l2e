DROP POLICY IF EXISTS "Quests are readable by members" ON public.quests;

CREATE POLICY "Quests are readable by members"
ON public.quests
FOR SELECT
TO authenticated
USING (
  visibility = 'public'
  OR creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.quest_participants p
    WHERE p.quest_id = quests.id AND p.user_id = auth.uid()
  )
);