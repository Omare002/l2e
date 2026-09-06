REVOKE ALL ON FUNCTION public.quest_standings(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_finished_quests() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_quest_invite() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quest_standings(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_finished_quests() TO service_role;