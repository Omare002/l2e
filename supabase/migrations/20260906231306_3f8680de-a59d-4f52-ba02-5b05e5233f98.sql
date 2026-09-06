-- Guests must not read raw account identifiers directly from these tables.
-- Public quest pages are served via server functions using the service role,
-- which bypasses RLS, so restricting direct SELECT to authenticated users
-- does not affect what visitors can see on the site.

DROP POLICY IF EXISTS "Quests are public" ON public.quests;
CREATE POLICY "Quests are readable by members" ON public.quests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Quest participants are public" ON public.quest_participants;
CREATE POLICY "Quest participants readable by members" ON public.quest_participants
  FOR SELECT TO authenticated USING (true);