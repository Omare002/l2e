REVOKE EXECUTE ON FUNCTION public.log_project_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vote_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_profile_created() FROM PUBLIC, anon, authenticated;