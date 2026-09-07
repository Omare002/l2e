REVOKE ALL ON FUNCTION public.guard_quest_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_quest_submission() TO service_role;