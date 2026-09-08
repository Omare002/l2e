CREATE POLICY "Creators delete their own quests"
ON public.quests
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);